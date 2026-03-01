#!/usr/bin/env python3
"""
Copy a markdown file from an Obsidian vault into src/posts, run eleventy build, and optionally publish via wrangler.

Usage:
  ./scripts/publish_from_obsidian.py /path/to/vault/Note.md [--publish]

Behavior:
- Copies the specified .md file into src/posts (keeps filename).
- Runs `npm run build` (eleventy) to generate public/.
- If --publish is passed, runs `wrangler publish --site ./public` to push to Cloudflare.

Notes:
- This is a simple, local uploader. For production, consider a GitHub Actions workflow that builds and publishes on push.
"""
import sys, os, subprocess, shutil

if len(sys.argv) < 2:
    print('Usage: publish_from_obsidian.py /path/to/vault/Note.md [--publish]')
    sys.exit(1)

src = sys.argv[1]
if not os.path.exists(src):
    print('Source not found:', src)
    sys.exit(1)

# ensure scripts run from repo root
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
posts_dir = os.path.join(repo_root,'src','posts')
if not os.path.isdir(posts_dir):
    os.makedirs(posts_dir, exist_ok=True)

basename = os.path.basename(src)
# ensure md extension
if not basename.lower().endswith('.md'):
    print('Warning: source does not look like markdown. Continuing anyway.')

dst = os.path.join(posts_dir, basename)
shutil.copy(src, dst)
print('Copied to', dst)

# build
print('Running npm run build...')
proc = subprocess.run(['npm','run','build'], cwd=repo_root)
if proc.returncode != 0:
    print('Build failed')
    sys.exit(proc.returncode)

if '--publish' in sys.argv:
    print('Publishing via wrangler...')
    proc = subprocess.run(['wrangler','publish','--site','./public'], cwd=repo_root)
    if proc.returncode != 0:
        print('Publish failed')
        sys.exit(proc.returncode)

print('Done')
