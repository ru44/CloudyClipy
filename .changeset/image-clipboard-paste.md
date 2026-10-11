---
'cclip': minor
---

Image clipboard support and reliability fixes

- `paste` now puts images back into the system clipboard on macOS, Windows, Wayland and X11 (previously it pasted the raw data URI as text)
- `copy-image <name>` without a path uploads the image currently in your clipboard
- `paste --out <file|dir>` saves an entry to disk, useful on headless machines
- Images are validated by file signature; `paste shot` finds `shot.png`
- Fix `list`, `listWithContent` and `cleanup-expired` crashing on the placeholder file created by `init`
- Fix entries failing to paste once the gist exceeds the Gist API's 1MB content limit
- Fix `clear` failing with 422 by keeping the placeholder file
- Only read the clipboard/stdin for `copy`, so other commands work without a display
- Update clipboardy to 5.3.2 (fixes the Windows `clipboard_x86_64.exe` paste panic)
- Lower the image size limit to 3MB so stored images stay within the Gist raw file limit
