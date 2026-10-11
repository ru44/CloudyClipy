# cclip

## 5.0.0

### Major Changes

- 9aa4356: Encryption v2, image clipboard support and new commands

  **Breaking:** entries are now written in a new encryption format that cclip 4.x can't read. Upgrade cclip on every machine. Entries written by 4.x are still readable; run `cclip rotate-key` once to migrate them.

  - Encryption v2: AES-256-GCM with a random IV per entry, a scrypt-derived key salted with the gist ID, and base64 storage (~33% smaller than hex)
  - `init` generates a random secret key instead of using the gist ID (which is part of the gist URL), accepts passphrases of any length, and prints the setup command for other machines
  - New `rotate-key [secretKey]` command re-encrypts every entry with a new key
  - New `delete <name>` command removes a single entry
  - `paste --stdout` prints an entry (text or raw image bytes) for piping
  - Show a notice when a newer cclip version is published (checked at most once a day; set `NO_UPDATE_NOTIFIER=1` to disable)
  - `paste --out <file|dir>` saves an entry to disk
  - `paste` now puts images back into the system clipboard on macOS, Windows, Wayland and X11 (previously it pasted the raw data URI as text)
  - `copy-image <name>` without a path uploads the image currently in your clipboard
  - Images are validated by file signature; `paste shot` finds `shot.png`
  - Fix `list`, `listWithContent` and `cleanup-expired` crashing on the placeholder file created by `init`
  - Fix entries failing to paste once the gist exceeds the Gist API's 1MB content limit
  - Fix `clear` failing with 422 by keeping the placeholder file
  - Only read the clipboard/stdin for `copy`, so other commands work without a display
  - Update clipboardy to 5.3.2 (fixes the Windows `clipboard_x86_64.exe` paste panic)

## 4.0.1

### Patch Changes

- c1df507: just fix help message

## 4.0.0

### Major Changes

- c8850c1: add two new features support image and expiration

## 3.1.1

### Patch Changes

- 56e9307: update packages to latest

## 3.1.0

### Minor Changes

- 42c77f2: add custom secret key instead of gist id or use the gist id if the user did not provide any key

## 3.0.1

### Patch Changes

- 654ac61: print the version and remove the map

## 3.0.0

### Major Changes

- c6d9fbf: Now Your Clipboard is Encrypted, also add new feature for purge the gists, Refactor the code to make it more clean

## 2.1.1

### Patch Changes

- 965a0ee: Urgent fix

## 2.1.0

### Minor Changes

- 387760d: update files structure

## 2.0.1

### Patch Changes

- 66cb358: update some files and convert it from class to functions

## 2.0.0

### Major Changes

- 7e0f623: # First Release

  first release
