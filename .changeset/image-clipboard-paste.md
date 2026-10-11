---
'cclip': major
---

Encryption v2, image clipboard support and new commands

**Breaking:** entries are now written in a new encryption format that cclip 4.x can't read. Upgrade cclip on every machine. Entries written by 4.x are still readable; run `cclip rotate-key` once to migrate them.

- Encryption v2: AES-256-GCM with a random IV per entry, a scrypt-derived key salted with the gist ID, and base64 storage (~33% smaller than hex)
- `init` generates a random secret key instead of using the gist ID (which is part of the gist URL), accepts passphrases of any length, and prints the setup command for other machines
- New `rotate-key [secretKey]` command re-encrypts every entry with a new key
- New `delete <name>` command removes a single entry
- `paste --stdout` prints an entry (text or raw image bytes) for piping
- `paste --out <file|dir>` saves an entry to disk
- `paste` now puts images back into the system clipboard on macOS, Windows, Wayland and X11 (previously it pasted the raw data URI as text)
- `copy-image <name>` without a path uploads the image currently in your clipboard
- Images are validated by file signature; `paste shot` finds `shot.png`
- Fix `list`, `listWithContent` and `cleanup-expired` crashing on the placeholder file created by `init`
- Fix entries failing to paste once the gist exceeds the Gist API's 1MB content limit
- Fix `clear` failing with 422 by keeping the placeholder file
- Only read the clipboard/stdin for `copy`, so other commands work without a display
- Update clipboardy to 5.3.2 (fixes the Windows `clipboard_x86_64.exe` paste panic)
