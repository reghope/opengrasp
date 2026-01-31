#!/usr/bin/env bash
set -euo pipefail

PREFIX="$HOME/.opengrasp"
TAG="latest"
NO_ONBOARD=0
NO_PROMPT=0
DRY_RUN=0

usage() {
  cat <<'USAGE'
OpenGrasp install-cli.sh (non-root install with dedicated Bun)

Usage:
  curl -fsSL https://opengrasp.com/install-cli.sh | bash

Flags:
  --prefix <path>          Install prefix (default: ~/.opengrasp)
  --tag <dist-tag|version> Package tag/version (default: latest)
  --no-onboard             Skip onboarding
  --no-prompt              Fail instead of prompting
  --dry-run                Print actions only
  -h, --help               Show help

Env vars:
  OPENGRASP_PREFIX=...
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
    --prefix) PREFIX="$2"; shift 2;;
    --tag) TAG="$2"; shift 2;;
    --no-onboard) NO_ONBOARD=1; shift;;
    --no-prompt) NO_PROMPT=1; shift;;
    --dry-run) DRY_RUN=1; shift;;
    -h|--help) usage; exit 0;;
    *) log "Unknown flag: $1"; usage; exit 1;;
  esac
 done

PREFIX="${PREFIX:-${OPENGRASP_PREFIX:-$HOME/.opengrasp}}"
TAG="${TAG:-${OPENGRASP_TAG:-latest}}"
NO_ONBOARD="${NO_ONBOARD:-${OPENGRASP_NO_ONBOARD:-0}}"
NO_PROMPT="${NO_PROMPT:-${OPENGRASP_NO_PROMPT:-0}}"
DRY_RUN="${DRY_RUN:-${OPENGRASP_DRY_RUN:-0}}"

BUN_INSTALL="$PREFIX/.bun"
export BUN_INSTALL
export PATH="$BUN_INSTALL/bin:$PATH"

log "Installing Bun into $BUN_INSTALL"
run "mkdir -p \"$PREFIX\""
run "curl -fsSL https://bun.sh/install | bash"

log "Installing OpenGrasp into Bun global store"
run "bun add -g opengrasp@${TAG}"

if [[ "$NO_ONBOARD" == "0" ]]; then
  log "Running onboarding..."
  run "opengrasp onboard --install-daemon"
else
  log "Skipping onboarding (--no-onboard)."
fi

log "Done. Ensure $BUN_INSTALL/bin is on PATH."
