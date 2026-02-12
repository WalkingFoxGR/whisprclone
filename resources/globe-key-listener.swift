import Cocoa
import Foundation

// Track Fn key state
var fnIsDown = false

// Flush stdout after every write
setbuf(stdout, nil)

// CGEvent tap callback
func eventCallback(
    proxy: CGEventTapProxy,
    type: CGEventType,
    event: CGEvent,
    refcon: UnsafeMutableRawPointer?
) -> Unmanaged<CGEvent>? {
    if type == .flagsChanged {
        let flags = CGEventFlags(rawValue: event.flags.rawValue)
        let containsFn = flags.contains(.maskSecondaryFn)

        if containsFn && !fnIsDown {
            fnIsDown = true
            print("FN_DOWN")
            fflush(stdout)
        } else if !containsFn && fnIsDown {
            fnIsDown = false
            print("FN_UP")
            fflush(stdout)
        }
    }
    return Unmanaged.passRetained(event)
}

// Handle SIGTERM for graceful shutdown
signal(SIGTERM) { _ in
    exit(0)
}

signal(SIGINT) { _ in
    exit(0)
}

// Create event tap (listen only, no modification)
guard let tap = CGEvent.tapCreate(
    tap: .cgSessionEventTap,
    place: .headInsertEventTap,
    options: .listenOnly,
    eventsOfInterest: CGEventMask(1 << CGEventType.flagsChanged.rawValue),
    callback: eventCallback,
    userInfo: nil
) else {
    fputs("ERROR: Failed to create event tap. Check Accessibility permissions.\n", stderr)
    exit(1)
}

let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
CGEvent.tapEnable(tap: tap, enable: true)

// Signal we're ready
print("READY")
fflush(stdout)

// Run the event loop
CFRunLoopRun()
