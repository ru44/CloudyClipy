# TODO

## Features

- [x] Encrypt clipboard data before storing in the cloud.
  - [x] Add configuration option for encryption.
  - [x] Implement encryption/decryption logic.
  - [x] Update storage logic for encrypted data.
  - [x] Validate encryption key.
- [x] Add support for custom expiration times for clipboard data.
  - [x] Add configuration option for default expiration time.
  - [x] Allow custom expiration time for clipboard data.
  - [x] Implement auto-delete for expired data.
  - [x] Update storage logic for expiration times.
  - [x] Validate expiration time format.
- [x] Implement copy image feature to store images in the cloud.
  - [x] Add command to copy images to the cloud (`copy-image`), from a file or the system clipboard.
  - [x] Paste images back into the system clipboard, or save them with `--out`.
  - [x] Update storage logic for image data.
  - [x] Validate image format (by file signature, not extension).
- [x] Cross-platform image clipboard (macOS, Windows, Wayland, X11).
- [x] Support entries larger than the Gist API's 1MB content limit.
- [x] `delete <name>` command to remove a single entry.
- [x] `paste --stdout` to print an entry for piping (`cclip paste cmd --stdout | sh`).
- [x] Encryption v2: AES-256-GCM with a random IV per entry and a scrypt-derived key. v1 entries stay readable.
  - [x] `rotate-key` to re-encrypt entries with a new key (and migrate v1 entries).
  - [x] Generate a random secret key on `init` instead of defaulting to the gist ID.
- [x] Store ciphertext as base64 instead of hex (~33% smaller; image limit back to 5MB).
- [x] Derive the key from a passphrase so a second machine only needs the passphrase.
- [x] Unit tests for expiration, image detection and encryption.

## Next

- [ ] Copy arbitrary files, not only text and images.
