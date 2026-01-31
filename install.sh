#!/usr/bin/env bash
set -euo pipefail

# OpenGrasp installer (Linux/macOS/WSL)

INSTALL_METHOD=""
GIT_DIR="$HOME/opengrasp"
NO_ONBOARD=0
NO_PROMPT=0
DRY_RUN=0
TAG="latest"

usage() {
  cat <<'USAGE'
OpenGrasp install.sh

Usage:
  curl -fsSL https://opengrasp.com/install.sh | bash

Flags:
  --install-method bun|git   Install via bun global package or git checkout
  --git-dir <path>           Target dir for git install (default: ~/opengrasp)
  --tag <dist-tag|version>   Package tag/version (default: latest)
  --no-onboard               Skip onboarding
  --no-prompt                Fail instead of prompting
  --dry-run                  Print actions only
  -h, --help                 Show help

Env vars:
  OPENGRASP_INSTALL_METHOD=git|bun
  OPENGRASP_GIT_DIR=...
  OPENGRASP_TAG=...
  OPENGRASP_NO_ONBOARD=1
  OPENGRASP_NO_PROMPT=1
  OPENGRASP_DRY_RUN=1
USAGE
}

log() { echo "[opengrasp] $*"; }
run() { if [[ "$DRY_RUN" == "1" ]]; then log "DRY_RUN: $*"; else eval "$*"; fi }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install-method) INSTALL_METHOD="$2"; shift 2;;
    --git-dir) GIT_DIR="$2"; shift 2;;
    --tag) TAG="$2"; shift 2;;
    --no-onboard) NO_ONBOARD=1; shift;;
    --no-prompt) NO_PROMPT=1; shift;;
    --dry-run) DRY_RUN=1; shift;;
    -h|--help) usage; exit 0;;
    *) log "Unknown flag: $1"; usage; exit 1;;
  esac
 done

INSTALL_METHOD="${INSTALL_METHOD:-${OPENGRASP_INSTALL_METHOD:-}}"
GIT_DIR="${GIT_DIR:-${OPENGRASP_GIT_DIR:-$HOME/opengrasp}}"
TAG="${TAG:-${OPENGRASP_TAG:-latest}}"
NO_ONBOARD="${NO_ONBOARD:-${OPENGRASP_NO_ONBOARD:-0}}"
NO_PROMPT="${NO_PROMPT:-${OPENGRASP_NO_PROMPT:-0}}"
DRY_RUN="${DRY_RUN:-${OPENGRASP_DRY_RUN:-0}}"

if [[ -z "$INSTALL_METHOD" ]]; then
  if [[ -f "package.json" ]] && rg -q '"name"\s*:\s*"opengrasp"' package.json 2>/dev/null; then
    if [[ "$NO_PROMPT" == "1" ]]; then
      log "Inside a source checkout. Pass --install-method git|bun."; exit 2
    fi
    log "Detected OpenGrasp checkout."
    read -r -p "Install from this checkout (git) or global bun install (bun)? [git/bun] " INSTALL_METHOD
  else
    INSTALL_METHOD="bun"
  fi
fi

if ! command -v bun >/dev/null 2>&1; then
  log "Bun not found. Installing bun..."
  run "curl -fsSL https://bun.sh/install | bash"
  export PATH="$HOME/.bun/bin:$PATH"
fi

if [[ "$INSTALL_METHOD" == "bun" ]]; then
  log "Installing OpenGrasp globally via bun..."
  run "bun add -g opengrasp@${TAG}"
elif [[ "$INSTALL_METHOD" == "git" ]]; then
  if ! command -v git >/dev/null 2>&1; then
    log "Git is required for git install."; exit 1
  fi
  if [[ -d "$GIT_DIR/.git" ]]; then
    log "Updating existing checkout at $GIT_DIR"
    if [[ "$DRY_RUN" != "1" ]]; then
      if [[ -n "$(git -C "$GIT_DIR" status --porcelain)" ]]; then
        if [[ "$NO_PROMPT" == "1" ]]; then
          log "Repo is dirty; aborting."; exit 2
        fi
        read -r -p "Repo dirty. Continue anyway? [y/N] " yn
        [[ "$yn" == "y" || "$yn" == "Y" ]] || exit 2
      fi
      git -C "$GIT_DIR" pull --rebase
    fi
  else
    log "Cloning OpenGrasp into $GIT_DIR"
  run "git clone https://github.com/reghope/opengrasp.git \"$GIT_DIR\""
  fi
  log "Installing deps + building"
  run "cd \"$GIT_DIR\" && bun install"
  run "cd \"$GIT_DIR\" && bun run build"
  # wrapper
  WRAP_DIR="$HOME/.opengrasp/bin"
  run "mkdir -p \"$WRAP_DIR\""
  run "cat > \"$WRAP_DIR/opengrasp\" <<'WRAP'\n#!/usr/bin/env bash\nexec bun \"$GIT_DIR/packages/cli/dist/index.js\" \"$@\"\nWRAP"
  run "chmod +x \"$WRAP_DIR/opengrasp\""
  log "Add $WRAP_DIR to PATH if not present."
else
  log "Unknown install method: $INSTALL_METHOD"; exit 1
fi

if [[ "$NO_ONBOARD" == "0" ]]; then
  log "Running onboarding..."
  run "opengrasp onboard --install-daemon"
else
  log "Skipping onboarding (--no-onboard)."
fi

log "Done. Run: opengrasp gateway"
