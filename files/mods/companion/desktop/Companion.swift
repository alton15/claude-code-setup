// Desktop companion: a transparent, always-on-top mascot that can follow the mouse and
// changes expression from the state file the companion mod writes.
// With a VRM in ~/.claude/companion/model/ it is a live 3D figure
// (Model3D.swift); otherwise, or if it fails to load, a still image per mood.
//
// Build: ./build.sh  (produces ~/.claude/companion/Companion.app)

import AppKit

// MARK: - Paths and state

let homeDir = FileManager.default.homeDirectoryForCurrentUser.path
let rootDir = "\(homeDir)/.claude/companion"
let stateFile = "\(rootDir)/state.json"
let assetsDir = "\(rootDir)/assets"

struct CompanionState: Decodable, Equatable {
    let mood: String
    let line: String
    let file: String
    let at: Double
    let activeTool: String?
    let contextPercent: Double?
    let fiveHourPercent: Double?
    let costUsd: Double?
}

enum Size: String, CaseIterable {
    case small, medium, large
    var points: CGFloat {
        switch self {
        case .small: return 120
        case .medium: return 180
        case .large: return 260
        }
    }
    var label: String {
        switch self {
        case .small: return "작게"
        case .medium: return "보통"
        case .large: return "크게"
        }
    }
}

enum Prefs {
    static let follow = "follow"
    static let desktop = "desktop"
    static let size = "size"
    static let x = "x"
    static let y = "y"
}

func randomImage(mood: String) -> String? {
    let dir = "\(assetsDir)/\(mood)"
    let names = (try? FileManager.default.contentsOfDirectory(atPath: dir)) ?? []
    let pngs = names.filter { $0.lowercased().hasSuffix(".png") }
    guard let name = pngs.randomElement() else { return nil }
    return "\(dir)/\(name)"
}

// MARK: - Views

/// The character: draws the image, mirrored when facing left, tilted toward the cursor.
final class MascotView: NSView {
    var image: NSImage? { didSet { needsDisplay = true } }
    var facingLeft = false { didSet { if oldValue != facingLeft { needsDisplay = true } } }
    var tilt: CGFloat = 0 { didSet { needsDisplay = true } }
    var bob: CGFloat = 0 { didSet { needsDisplay = true } }

    override var isFlipped: Bool { false }

    override func draw(_ dirtyRect: NSRect) {
        guard let context = NSGraphicsContext.current?.cgContext else { return }
        let box = bounds.insetBy(dx: 4, dy: 4)
        context.saveGState()
        context.translateBy(x: bounds.midX, y: bounds.minY + 4 + bob)
        context.rotate(by: tilt)
        if facingLeft { context.scaleBy(x: -1, y: 1) }
        let rect = NSRect(x: -box.width / 2, y: 0, width: box.width, height: box.height)
        if let image {
            image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1)
        } else {
            NSColor(calibratedRed: 0.22, green: 0.77, blue: 0.73, alpha: 0.9).setFill()
            NSBezierPath(ovalIn: rect.insetBy(dx: rect.width * 0.2, dy: rect.height * 0.2)).fill()
            let text = NSAttributedString(
                string: "♪",
                attributes: [.font: NSFont.boldSystemFont(ofSize: 40), .foregroundColor: NSColor.white]
            )
            text.draw(at: NSPoint(x: -12, y: rect.height / 2 - 24))
        }
        context.restoreGState()
    }
}

/// A rounded speech bubble above the character.
final class BubbleView: NSView {
    private let label = NSTextField(wrappingLabelWithString: "")

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.backgroundColor = NSColor.white.withAlphaComponent(0.95).cgColor
        layer?.cornerRadius = 12
        layer?.borderColor = NSColor(calibratedRed: 0.22, green: 0.77, blue: 0.73, alpha: 1).cgColor
        layer?.borderWidth = 2
        label.font = NSFont.systemFont(ofSize: 13, weight: .medium)
        label.textColor = NSColor(calibratedWhite: 0.15, alpha: 1)
        label.alignment = .center
        label.maximumNumberOfLines = 3
        addSubview(label)
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    var text: String {
        get { label.stringValue }
        set { label.stringValue = newValue; needsLayout = true }
    }

    override func layout() {
        super.layout()
        label.frame = bounds.insetBy(dx: 8, dy: 6)
    }
}

// MARK: - Window

final class CompanionWindow: NSPanel {
    init(size: CGFloat) {
        super.init(
            contentRect: NSRect(x: 0, y: 0, width: size + 80, height: size + 70),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        isOpaque = false
        backgroundColor = .clear
        hasShadow = false
        level = .floating
        collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary, .ignoresCycle]
        isMovableByWindowBackground = true
        hidesOnDeactivate = false
    }

    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

// MARK: - Controller

final class Controller: NSObject {
    private let window: CompanionWindow
    private let mascot = MascotView()
    private let bubble = BubbleView()
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private var model3D: Model3D?

    private var size: Size
    private var isFollowing: Bool
    /// Off: it lives only in the terminal pane; the window stays, unseen, to render it.
    private var isOnDesktop: Bool
    private var lastState: CompanionState?
    private var lastStateMtime: Date?
    private var bubbleHideAt: Date = .distantPast
    private var phase: CGFloat = 0

    /// The 3D figure is drawn and in charge; the still images wait as fallback.
    private var is3D: Bool { model3D?.isReady ?? false }
    /// A full-body 3D figure needs a taller box than a square sprite.
    private var bodyHeight: CGFloat { size.points * (is3D ? 1.5 : 1) }

    override init() {
        let defaults = UserDefaults.standard
        size = Size(rawValue: defaults.string(forKey: Prefs.size) ?? "") ?? .medium
        isFollowing = defaults.object(forKey: Prefs.follow) as? Bool ?? false
        isOnDesktop = defaults.object(forKey: Prefs.desktop) as? Bool ?? false
        window = CompanionWindow(size: size.points)
        super.init()

        let content = NSView(frame: window.contentRect(forFrameRect: window.frame))
        content.addSubview(mascot)
        content.addSubview(bubble)
        window.contentView = content
        layoutViews()

        let start = NSPoint(
            x: defaults.object(forKey: Prefs.x) as? CGFloat ?? 200,
            y: defaults.object(forKey: Prefs.y) as? CGFloat ?? 200
        )
        // A saved spot can be off screen after a display was unplugged.
        window.setFrameOrigin(clampedToScreen(start, near: start))
        applyFollowMode()
        window.orderFrontRegardless()

        setUpMenu()
        setUp3D(in: content)
        showImage(path: randomImage(mood: "idle"))
        say("안녕! 같이 해보자 ♪")

        Timer.scheduledTimer(withTimeInterval: 1.0 / 60.0, repeats: true) { [weak self] _ in self?.frame() }
        Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in self?.pollState() }
        let click = NSClickGestureRecognizer(target: self, action: #selector(clicked))
        content.addGestureRecognizer(click)
        // `/hud quit` kills the app, so a spot it was dragged to is kept as it happens.
        NotificationCenter.default.addObserver(
            forName: NSWindow.didMoveNotification, object: window, queue: .main
        ) { [weak self] _ in
            guard let self, !self.isFollowing else { return }
            self.savePosition()
        }
    }

    // MARK: Layout

    private func layoutViews() {
        let side = size.points
        window.setContentSize(NSSize(width: side + 80, height: bodyHeight + 70))
        mascot.frame = NSRect(x: 40, y: 0, width: side, height: side)
        model3D?.view.frame = NSRect(x: 40, y: 0, width: side, height: bodyHeight)
        bubble.frame = NSRect(x: 0, y: bodyHeight + 2, width: side + 80, height: 62)
    }

    // MARK: 3D

    /// Swaps the sprite for the VRM once it has loaded; any failure keeps the sprite.
    private func setUp3D(in content: NSView) {
        guard let model = Model3D(frame: mascot.frame) else { return }
        model.view.isHidden = true
        content.addSubview(model.view, positioned: .below, relativeTo: bubble)
        model.onReady = { [weak self, weak model] in
            guard let self, let model else { return }
            self.mascot.isHidden = true
            model.view.isHidden = false
            self.layoutViews()
            model.mood(self.lastState?.mood ?? "idle")
            model.showDesktop(self.isOnDesktop)
        }
        model.onError = { [weak self] message in
            NSLog("Companion: 3D model failed, using images: %@", message)
            self?.drop3D()
        }
        model.onClick = { [weak self] in self?.clicked() }
        model3D = model
    }

    private func drop3D() {
        model3D?.stop()
        model3D?.view.removeFromSuperview()
        model3D = nil
        mascot.isHidden = false
        layoutViews()
    }

    // MARK: Menu

    private func setUpMenu() {
        statusItem.button?.title = "♪"
        let menu = NSMenu()
        let follow = NSMenuItem(title: "마우스 추적 (따라다니기·쳐다보기)", action: #selector(toggleFollow), keyEquivalent: "f")
        follow.target = self
        follow.state = isFollowing ? .on : .off
        menu.addItem(follow)

        let desktop = NSMenuItem(title: "화면에 띄우기", action: #selector(toggleDesktop), keyEquivalent: "d")
        desktop.target = self
        desktop.state = isOnDesktop ? .on : .off
        menu.addItem(desktop)

        let sizeMenu = NSMenu()
        for option in Size.allCases {
            let item = NSMenuItem(title: option.label, action: #selector(pickSize(_:)), keyEquivalent: "")
            item.target = self
            item.representedObject = option.rawValue
            item.state = option == size ? .on : .off
            sizeMenu.addItem(item)
        }
        let sizeItem = NSMenuItem(title: "크기", action: nil, keyEquivalent: "")
        sizeItem.submenu = sizeMenu
        menu.addItem(sizeItem)

        menu.addItem(.separator())
        let quit = NSMenuItem(title: "컴패니언 종료", action: #selector(quit), keyEquivalent: "q")
        quit.target = self
        menu.addItem(quit)
        statusItem.menu = menu
    }

    @objc private func toggleFollow(_ sender: NSMenuItem) {
        isFollowing.toggle()
        sender.state = isFollowing ? .on : .off
        UserDefaults.standard.set(isFollowing, forKey: Prefs.follow)
        applyFollowMode()
        if !isFollowing {
            savePosition()
            model3D?.forgetPointer()
        }
        say(isFollowing ? "따라갈게~!" : "여기 있을게!")
    }

    @objc private func toggleDesktop(_ sender: NSMenuItem) {
        isOnDesktop.toggle()
        sender.state = isOnDesktop ? .on : .off
        UserDefaults.standard.set(isOnDesktop, forKey: Prefs.desktop)
        applyFollowMode()
        model3D?.showDesktop(isOnDesktop)
    }

    @objc private func pickSize(_ sender: NSMenuItem) {
        guard let raw = sender.representedObject as? String, let picked = Size(rawValue: raw) else { return }
        size = picked
        UserDefaults.standard.set(raw, forKey: Prefs.size)
        sender.menu?.items.forEach { $0.state = $0 == sender ? .on : .off }
        layoutViews()
    }

    @objc private func quit() {
        savePosition()
        model3D?.stop()
        NSApp.terminate(nil)
    }

    @objc private func clicked() {
        showImage(path: randomImage(mood: "happy"))
        model3D?.mood("happy")
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) { [weak self] in
            self?.model3D?.mood(self?.lastState?.mood ?? "idle")
        }
        say(["에헤헤 ♪", "왜~? 불렀어?", "같이 코딩하자!"].randomElement() ?? "♪")
    }

    /// Following: clicks pass through so the cursor never fights the mascot.
    /// Staying: it can be dragged and clicked.
    /// Off the desktop: fully transparent and clicks pass through. The window is
    /// kept on screen rather than ordered out, since WebKit stops drawing a
    /// hidden window and the pane's frames would stop with it.
    private func applyFollowMode() {
        window.ignoresMouseEvents = isFollowing || !isOnDesktop
        window.alphaValue = isOnDesktop ? 1 : 0
    }

    private func savePosition() {
        UserDefaults.standard.set(window.frame.origin.x, forKey: Prefs.x)
        UserDefaults.standard.set(window.frame.origin.y, forKey: Prefs.y)
    }

    // MARK: Frame loop

    private func frame() {
        phase += 0.05
        let busy = lastState.map { ["thinking", "working"].contains($0.mood) } ?? false
        mascot.bob = sin(phase * (busy ? 3 : 1)) * (busy ? 4 : 2)
        followCursor()
        fadeBubble()
    }

    /// With tracking on it leans and looks toward the cursor and walks after it;
    /// with it off it stands upright where it was left.
    private func followCursor() {
        guard isFollowing else {
            mascot.tilt -= mascot.tilt * 0.1
            return
        }
        let mouse = NSEvent.mouseLocation
        let frame = window.frame
        let center = NSPoint(x: frame.midX, y: frame.minY + bodyHeight / 2)
        let dx = mouse.x - center.x

        let lean = max(-0.14, min(0.14, -dx / 2500))
        mascot.tilt += (lean - mascot.tilt) * 0.1
        if abs(dx) > 20 { mascot.facingLeft = dx < 0 }
        model3D?.pointer(screen: mouse)

        let target = followTarget(mouse: mouse, preferLeft: dx >= 0)
        let distance = hypot(target.x - frame.minX, target.y - frame.minY)
        guard distance > 1 else { return }
        let ease: CGFloat = distance > 400 ? 0.25 : 0.16
        let next = NSPoint(
            x: frame.minX + (target.x - frame.minX) * ease,
            y: frame.minY + (target.y - frame.minY) * ease
        )
        window.setFrameOrigin(clampedToScreen(next, near: mouse))
    }

    private func fadeBubble() {
        let bubbleVisible = Date() < bubbleHideAt
        let alpha: CGFloat = bubbleVisible ? 1 : 0
        if bubble.alphaValue != alpha {
            NSAnimationContext.runAnimationGroup { ctx in
                ctx.duration = 0.25
                bubble.animator().alphaValue = alpha
            }
        }
    }

    /// Where the window should sit: the body right beside the cursor, head about
    /// level with it. It takes the other side, or goes above, near screen edges.
    private func followTarget(mouse: NSPoint, preferLeft: Bool) -> NSPoint {
        let frame = window.frame
        let bounds = screen(near: mouse).visibleFrame
        let gap = size.points * (is3D ? 0.3 : 0.38)
        let leftX = mouse.x - gap - frame.width / 2
        let rightX = mouse.x + gap - frame.width / 2
        let fitsLeft = leftX >= bounds.minX
        let fitsRight = rightX + frame.width <= bounds.maxX
        let x = preferLeft ? (fitsLeft || !fitsRight ? leftX : rightX) : (fitsRight || !fitsLeft ? rightX : leftX)

        let belowY = mouse.y - bodyHeight * (is3D ? 0.92 : 0.85)
        let aboveY = mouse.y + 16
        let y = belowY >= bounds.minY ? belowY : aboveY
        return NSPoint(x: x, y: y)
    }

    private func screen(near point: NSPoint) -> NSScreen {
        NSScreen.screens.first { NSMouseInRect(point, $0.frame, false) } ?? NSScreen.main ?? NSScreen.screens[0]
    }

    /// Keeps the whole window, speech bubble included, inside the visible screen.
    private func clampedToScreen(_ origin: NSPoint, near point: NSPoint) -> NSPoint {
        let bounds = screen(near: point).visibleFrame
        let extent = window.frame.size
        return NSPoint(
            x: min(max(origin.x, bounds.minX), bounds.maxX - extent.width),
            y: min(max(origin.y, bounds.minY), bounds.maxY - extent.height)
        )
    }

    // MARK: State file

    private func pollState() {
        guard
            let attrs = try? FileManager.default.attributesOfItem(atPath: stateFile),
            let mtime = attrs[.modificationDate] as? Date,
            mtime != lastStateMtime
        else { return }
        lastStateMtime = mtime

        guard
            let data = FileManager.default.contents(atPath: stateFile),
            let state = try? JSONDecoder().decode(CompanionState.self, from: data)
        else { return }

        let previous = lastState
        lastState = state
        if previous?.file != state.file || previous?.mood != state.mood {
            showImage(path: state.file.isEmpty ? randomImage(mood: state.mood) : state.file)
        }
        if previous?.mood != state.mood { model3D?.mood(state.mood) }
        if previous?.line != state.line || previous?.at != state.at {
            say(state.line, sticky: ["thinking", "working"].contains(state.mood))
        }
    }

    private func showImage(path: String?) {
        guard let path, let image = NSImage(contentsOfFile: path) else { return }
        mascot.image = image
    }

    private func say(_ text: String, sticky: Bool = false) {
        guard !text.isEmpty else { return }
        bubble.text = text
        model3D?.talk(seconds: min(4, 0.6 + Double(text.count) * 0.07))
        bubbleHideAt = Date().addingTimeInterval(sticky ? 20 : 6)
    }
}

// MARK: - Main

@main
enum CompanionApp {
    static func main() {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)
        let controller = Controller()
        withExtendedLifetime(controller) { app.run() }
    }
}
