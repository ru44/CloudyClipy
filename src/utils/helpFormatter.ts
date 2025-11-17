import version from '../../package.json' with { type: 'json' }

export function showCustomHelp() {
	console.log(`
CloudyClipy 🌥️✂️ - Your clipboard in the cloud
Version: ${version.version}

USAGE:
  cclip <command> [options]

COMMANDS:
  Init & Setup:
    i, init <token> [secretKey] [gistId]
        Initialize with GitHub token and optional secret key & Gist ID
        
  Copy & Paste:
    c, copy <name> [-e <time>]
        Copy content to cloud clipboard
        Options: -e, --expires  Expiration time (e.g., 30m, 2h, 7d)
        
    ci, copy-image <name> <path> [-e <time>]
        Copy an image file to cloud clipboard
        Options: -e, --expires  Expiration time (e.g., 30m, 2h, 7d)
        
    p, paste <name>
        Paste content from cloud clipboard
        
  List & View:
    l, list
        List files in cloud clipboard
        
    lc, listWithContent
        List files with their content
        
  Manage:
    se, set-expiration <expiration>
        Set default expiration time (e.g., 30m, 2h, 7d)
        
    ce, cleanup-expired
        Remove all expired clipboard entries
        
    r, clear
        Clear the entire cloud clipboard
        
    pr, purge
        Purge all revisions from cloud clipboard
        
  Help:
    h, help
        Show help message
        
    --version
        Show version number

EXAMPLES:
  cclip init ghp_your_github_token_here
  cclip copy mydata -e 2h
  cclip copy-image screenshot ./image.png -e 1d
  cclip paste mydata
  cclip list
  cclip set-expiration 24h
  cclip cleanup-expired

Developed with ♥ by '@Ru44'
Repository: https://github.com/ru44/CloudyClipy
`)
	process.exit(0)
}
