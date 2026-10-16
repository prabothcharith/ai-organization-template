#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then
  for arg in "$@"; do
    if [[ "$arg" == "--dry-run" ]]; then
      echo 'WOULD INSTALL Node 24+ (Homebrew if present); no changes made.'
      exit 0
    fi
  done
  if [[ "$(uname -s)" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
    echo 'Installing Node 24 via Homebrew (official package manager)...'
    brew install node@24
    export PATH="$(brew --prefix node@24)/bin:$PATH"
  else
    echo 'Node is missing. Install Node 24+ using an official installer or supported package manager, then re-run this script.' >&2
    exit 2
  fi
fi
node --experimental-strip-types src/cli.ts setup --profile all "$@"
