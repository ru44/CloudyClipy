<div align="center">

# CloudyClipy 🌥️✂️

**Your own clipboard in the cloud.** Copy on one machine, paste on another, all from the terminal.

[![npm version](https://img.shields.io/npm/v/cclip?color=cb3837&logo=npm)](https://www.npmjs.com/package/cclip)
[![npm downloads](https://img.shields.io/npm/dm/cclip?color=blue)](https://www.npmjs.com/package/cclip)
[![CI](https://github.com/ru44/CloudyClipy/actions/workflows/main.yml/badge.svg)](https://github.com/ru44/CloudyClipy/actions/workflows/main.yml)
[![License: MIT](https://img.shields.io/github/license/ru44/CloudyClipy)](LICENSE)

</div>

CloudyClipy (`cclip`) stores encrypted clipboard entries in a **secret GitHub Gist**, so there are no servers to run and no accounts beyond the GitHub one you already have. Inspired by [CloudClip](https://github.com/skywind3000/CloudClip).

```bash
# laptop
echo "ssh-ed25519 AAAA..." | cclip copy key

# server
cclip paste key        # now it's in your clipboard
```

## ✨ Features

- **📋 Text and images.** Sync text, code, or images (PNG, JPEG, GIF, WebP) between machines.
- **🖼️ Screenshot to cloud.** `cclip copy-image shot` uploads whatever image is in your clipboard, and `cclip paste shot` puts it back on another machine.
- **🔐 End-to-end encrypted.** Entries are encrypted with AES-256-GCM before they leave your machine. The key is derived from your passphrase with scrypt and never uploaded, and `rotate-key` swaps it at any time.
- **⏳ Expiring entries.** Give an entry a lifetime (`-e 30m`, `2h`, `7d`) or set a default; expired entries can't be pasted and can be cleaned up in one command.
- **🔀 Pipes and files.** Copy from stdin (`cat file | cclip copy notes`), paste to stdout (`cclip paste notes --stdout | less`) or to a file (`-o ./notes.txt`). Handy on headless servers.
- **📦 Large entries.** Entries over GitHub's 1 MB API limit are downloaded from the raw file automatically.
- **🧹 History control.** `delete` removes one entry, `clear` removes all of them, and `purge` also rewrites the gist's revision history.
- **💻 Cross-platform.** macOS, Linux (Wayland and X11) and Windows.
- **🔔 Update notifications.** cclip tells you when a new version is out (checked at most once a day).
- **🆓 Zero infrastructure.** Your data lives in your own GitHub account.

## 🚀 Quick start

### 1. Install

Requires **Node.js 20.19 or newer**.

```bash
npm i -g cclip        # or: pnpm add -g cclip / yarn global add cclip / bun add -g cclip
```

Or run it once without installing: `npx cclip <command>`.

### 2. Create a GitHub token

Create a token at <https://github.com/settings/tokens> with the **`gist`** scope only.

### 3. Initialize

```bash
cclip init <your-github-token>
```

This creates a secret gist, generates a random secret key, and saves everything to `~/.cloudclip.json`. It also prints the command to run on your other machines.

Prefer a passphrase you can remember? Pass it as the second argument: `cclip init <token> "my long passphrase"`.

### 4. Use it

```bash
cclip copy notes            # copies your current clipboard to the cloud as "notes"
cclip paste notes           # puts "notes" back into your clipboard
```

## 📖 Commands

| Command | Alias | Description |
| --- | --- | --- |
| `init <token> [secretKey] [gistId]` | `i` | Configure cclip. Creates a new gist unless `gistId` is given. |
| `copy <name> [-e <time>]` | `c` | Copy text from your clipboard, or from stdin when piped. |
| `copy-image <name> [path] [-e <time>]` | `ci` | Copy an image file, or the image in your clipboard when `path` is omitted. |
| `paste <name> [-o <file\|dir>] [-s]` | `p` | Paste text or an image into your clipboard, save it with `--out`, or print it with `--stdout`. |
| `delete <name>` | `d` | Delete a single entry. |
| `list` | `l` | List entries with size, type and time left. |
| `listWithContent` | `lc` | List entries and print text content. |
| `set-expiration <time>` | `se` | Set the default expiration for new entries. |
| `cleanup-expired` | `ce` | Delete all expired entries. |
| `clear` | `r` | Delete every entry. |
| `rotate-key [secretKey]` | `rk` | Re-encrypt every entry with a new key (random if omitted). |
| `purge` | `pr` | Reset the gist and its revision history to the first commit (needs `git`). |
| `help` | `h` | Show the help screen. |

Expiration times use `<number><unit>`, where the unit is `m` (minutes), `h` (hours) or `d` (days): `30m`, `2h`, `7d`.

## 💡 Examples

**Text and pipes**

```bash
cclip copy snippet                       # from the system clipboard
git diff | cclip copy patch -e 1h        # from stdin, expires in 1 hour
cclip paste patch -o ./fix.patch         # save to a file instead of the clipboard
cclip paste patch --stdout | git apply   # or pipe it straight into another command
```

**Images**

```bash
cclip copy-image diagram ./diagram.png   # from a file
cclip copy-image shot -e 1d              # from the clipboard (take a screenshot first)
cclip paste shot                         # image goes straight into your clipboard
cclip paste shot -o ~/Downloads          # or save it as ~/Downloads/shot.png
cclip paste shot --stdout > shot.png     # or redirect the raw bytes
```

Images are identified by their content, not their file extension, and are limited to 5 MB. When you omit the extension, `paste shot` finds `shot.png` automatically.

**Housekeeping**

```bash
cclip set-expiration 24h                 # every new entry expires after a day
cclip list
cclip delete patch
cclip cleanup-expired
```

## 🔁 Using it on more than one machine

Every machine needs the **same secret key and gist ID**. `init` prints the exact command; you can also find both values in `~/.cloudclip.json`:

```bash
cclip init <token> <secretKey> <gistId>
```

If you change the key with `cclip rotate-key`, run `init` again with the new key on your other machines.

### Upgrading from 4.x

cclip 5 writes entries in a new encryption format that cclip 4.x can't read, so **upgrade every machine**. Entries written by 4.x are still readable.

Then run `cclip rotate-key` once. This re-encrypts your old entries in the new format. If you set up cclip without a secret key, your key was your gist ID, which appears in the gist URL; rotating replaces it with a random key. cclip prints a warning on `copy` until you do.

## 🔐 How it works & security

- Each entry is a file in a **secret** gist. Secret gists are unlisted, not private: anyone who has the URL can open them, which is why every entry is encrypted.
- Entries are wrapped with their metadata (expiry, type) and encrypted with **AES-256-GCM** before upload. Each entry gets a random IV, so identical content never produces identical ciphertext, and GCM detects any tampering.
- The encryption key is derived from your secret key with **scrypt**, salted with the gist ID. Any passphrase length works, and the key itself is never uploaded.
- Your token and secret key are stored in plain text in `~/.cloudclip.json`. Protect that file the way you protect your SSH keys.
- `clear` deletes entries, but the gist still keeps old revisions. Run `purge` to rewrite the history as well.

## 🖥️ Platform support

| Platform | Text | Images |
| --- | --- | --- |
| macOS | ✅ built in | ✅ built in |
| Windows | ✅ built in | ✅ via PowerShell (built in) |
| Linux (Wayland) | ✅ `wl-clipboard`, or the bundled `xsel` | ✅ `wl-clipboard`, or `xclip` |
| Linux (X11) | ✅ bundled `xsel` | ✅ needs `xclip` |
| Headless / SSH | ✅ with pipes and `--out` | ✅ with `--out` |

On Debian or Ubuntu, install the Linux tools with `sudo apt install wl-clipboard xclip`.

## 🔔 Update notifications

When a newer version of cclip is published, you'll see a short notice after a command finishes:

```text
Update available 4.0.1 → 5.0.0
Run npm i -g cclip@latest to update.
```

cclip asks the npm registry at most once a day, in parallel with your command, and caches the answer in `~/.cloudclip-update.json`. The check never runs in CI or when output isn't a terminal, and failures are ignored. To turn it off, set `NO_UPDATE_NOTIFIER=1`.

## 🛠️ Troubleshooting

<details>
<summary><b>Windows: <code>clipboard_x86_64.exe ... panicked</code> when pasting</b></summary>

This was a bug in older clipboardy versions. CloudyClipy now uses clipboardy 5.3, which reads and writes the clipboard through PowerShell first. Update with `npm i -g cclip@latest`.

</details>

<details>
<summary><b>Linux: <code>"xclip" was not found</code> / <code>"wl-copy" was not found</code></b></summary>

Install the clipboard tool for your session (`wl-clipboard` for Wayland, `xclip` for X11). On a server without a display, use `--out` to save to a file instead.

</details>

<details>
<summary><b><code>Could not decrypt "..."</code> or <code>cannot decrypt: different secret key?</code></b></summary>

The entry was copied from a machine with a different `secretKey`. Make sure every machine uses the same values (see [Using it on more than one machine](#-using-it-on-more-than-one-machine)).

If an **older cclip (4.x)** shows `The argument 'encoding' is invalid`, it is trying to read an entry written by cclip 5. Upgrade it with `npm i -g cclip@latest`.

</details>

## 🧑‍💻 Development

```bash
git clone https://github.com/ru44/CloudyClipy.git
cd CloudyClipy
pnpm install
pnpm build            # bundle to dist/ with tsup
node dist/main.js help
pnpm test             # unit tests (node:test)
pnpm check            # format and lint with Biome
```

Releases are managed with [Changesets](https://github.com/changesets/changesets). Run `pnpm changeset` to describe your change in a PR. See [TODO.md](TODO.md) for the roadmap.

## 🤝 Contributing

Issues and pull requests are welcome. Use the [issue templates](.github/ISSUE_TEMPLATE) for bugs and feature ideas, and see [SECURITY.md](SECURITY.md) for how to report vulnerabilities.

If CloudyClipy saves you time, consider [sponsoring](https://github.com/sponsors/ru44) ❤️

## 📄 License

[MIT](LICENSE) © [ru44](https://github.com/ru44)
