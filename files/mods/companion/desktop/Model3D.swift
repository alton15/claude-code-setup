// The 3D body: a transparent web view running the bundled three-vrm renderer
// on the VRM in ~/.claude/companion/model/. It also hands bust-shot frames
// to the mod's terminal pane through ~/.claude/companion/live/.

import AppKit
import WebKit

let modelDir = "\(rootDir)/model"
let liveDir = "\(rootDir)/live"
let liveFrameFile = "\(liveDir)/frame.png"
let liveAliveFile = "\(liveDir)/alive"
let liveWantFile = "\(liveDir)/want"

/// How recently the mod must have asked for frames for us to keep writing them.
let paneWantFreshS: TimeInterval = 5

/// `model.vrm` if present, else the first VRM by name.
func modelFileName() -> String? {
    let names = (try? FileManager.default.contentsOfDirectory(atPath: modelDir)) ?? []
    let models = names.filter { $0.lowercased().hasSuffix(".vrm") }.sorted()
    return models.contains("model.vrm") ? "model.vrm" : models.first
}

/// Serves the app's bundled web folder and the model folder under `companion://app/`.
/// Only bare file names resolve.
final class CompanionSchemeHandler: NSObject, WKURLSchemeHandler {
    private let webDir = (Bundle.main.resourcePath ?? "") + "/web"

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, let path = filePath(for: url),
              let data = FileManager.default.contents(atPath: path)
        else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": mimeType(of: path), "Content-Length": "\(data.count)"]
        )
        task.didReceive(response ?? URLResponse())
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    /// One origin, so the renderer may fetch the model: `/<file>` is the web
    /// folder, `/model/<file>` the model folder.
    private func filePath(for url: URL) -> String? {
        let parts = url.pathComponents
        let name = url.lastPathComponent
        guard url.host == "app", !name.hasPrefix(".") else { return nil }
        switch parts.count {
        case 2: return "\(webDir)/\(name)"
        case 3 where parts[1] == "model": return "\(modelDir)/\(name)"
        default: return nil
        }
    }

    private func mimeType(of path: String) -> String {
        switch (path as NSString).pathExtension.lowercased() {
        case "html": return "text/html"
        case "js": return "text/javascript"
        default: return "application/octet-stream"
        }
    }
}

/// WKUserContentController keeps its handlers alive; this keeps it from keeping us.
private final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(controller, didReceive: message)
    }
}

final class Model3D: NSObject, WKScriptMessageHandler {
    let view: WKWebView
    var onReady: (() -> Void)?
    var onError: ((String) -> Void)?
    var onClick: (() -> Void)?

    private(set) var isReady = false
    private var isPaneWanted = false
    private var lastPointer = CGPoint(x: -1, y: -1)
    private var heartbeat: Timer?

    /// Nil when there is no model to show or no bundled renderer.
    init?(frame: NSRect) {
        guard let model = modelFileName(),
              let resources = Bundle.main.resourcePath,
              FileManager.default.fileExists(atPath: "\(resources)/web/companion3d.js"),
              let encoded = model.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
              let url = URL(string: "companion://app/index.html?model=model/\(encoded)")
        else { return nil }

        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(CompanionSchemeHandler(), forURLScheme: "companion")
        view = WKWebView(frame: frame, configuration: config)
        view.setValue(false, forKey: "drawsBackground")
        view.underPageBackgroundColor = .clear
        super.init()

        config.userContentController.add(WeakMessageHandler(self), name: "companion")
        view.load(URLRequest(url: url))
        try? FileManager.default.createDirectory(atPath: liveDir, withIntermediateDirectories: true)
    }

    deinit {
        heartbeat?.invalidate()
        view.configuration.userContentController.removeScriptMessageHandler(forName: "companion")
    }

    // MARK: Driving the renderer

    /// Cursor in screen coordinates; sent on as the web view's top-left CSS pixels.
    func pointer(screen point: NSPoint) {
        guard isReady, let window = view.window else { return }
        let local = view.convert(window.convertPoint(fromScreen: point), from: nil)
        let x = local.x.rounded()
        let y = (view.isFlipped ? local.y : view.bounds.height - local.y).rounded()
        guard x != lastPointer.x || y != lastPointer.y else { return }
        lastPointer = CGPoint(x: x, y: y)
        call("pointer(\(Int(x)), \(Int(y)))")
    }

    /// It stops following the cursor with its eyes and faces ahead.
    func forgetPointer() {
        lastPointer = CGPoint(x: -1, y: -1)
        call("forgetPointer()")
    }

    /// Off the desktop it draws only what the pane asks for.
    func showDesktop(_ isShown: Bool) {
        call("showDesktop(\(isShown))")
    }

    func mood(_ name: String) {
        guard let json = try? JSONEncoder().encode(name), let quoted = String(data: json, encoding: .utf8) else { return }
        call("mood(\(quoted))")
    }

    func talk(seconds: Double) {
        call("talk(\(seconds))")
    }

    private func call(_ script: String) {
        guard isReady else { return }
        view.evaluateJavaScript("window.companion && window.companion.\(script)", completionHandler: nil)
    }

    // MARK: Messages from the renderer

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "ready":
            isReady = true
            startHeartbeat()
            onReady?()
        case "error":
            onError?(body["message"] as? String ?? "unknown error")
        case "frame":
            if isPaneWanted, let png = body["png"] as? String, let data = Data(base64Encoded: png) {
                try? data.write(to: URL(fileURLWithPath: liveFrameFile), options: .atomic)
            }
        case "click":
            onClick?()
        default:
            break
        }
    }

    // MARK: Pane frames

    /// Every second: say we are alive, and stream frames only while the mod's
    /// pane keeps asking for them.
    private func startHeartbeat() {
        heartbeat?.invalidate()
        heartbeat = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            self?.beat()
        }
        beat()
    }

    private func beat() {
        FileManager.default.createFile(atPath: liveAliveFile, contents: Data("\(Date().timeIntervalSince1970)".utf8))
        let wantedAt = (try? FileManager.default.attributesOfItem(atPath: liveWantFile))?[.modificationDate] as? Date
        let isWanted = wantedAt.map { Date().timeIntervalSince($0) < paneWantFreshS } ?? false
        guard isWanted != isPaneWanted else { return }
        isPaneWanted = isWanted
        call("wantPane(\(isWanted))")
    }

    /// Tells the pane we are gone, so it falls back to still images.
    func stop() {
        heartbeat?.invalidate()
        try? FileManager.default.removeItem(atPath: liveAliveFile)
    }
}
