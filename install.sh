#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  DEV SETUP CLI — One-line installer
#  Usage: curl -fsSL https://raw.githubusercontent.com/blpsoares/init/main/install.sh | bash
# ─────────────────────────────────────────────────────────────
set -euo pipefail

REPO="blpsoares/init"
BINARY="setup"
INSTALL_DIR="${HOME}/.local/bin"
DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${BINARY}"

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'
GRN='\033[0;32m'
CYN='\033[0;36m'
MAG='\033[0;35m'
DIM='\033[2m'
BLD='\033[1m'
RST='\033[0m'

# ── Helpers ──────────────────────────────────────────────────
say()  { echo -e "${CYN}  ›${RST} $*"; }
ok()   { echo -e "${GRN}  ✔${RST} $*"; }
warn() { echo -e "\033[0;33m  ⚠${RST} $*"; }
err()  { echo -e "${RED}  ✘${RST} $*" >&2; exit 1; }

# ── Banner ───────────────────────────────────────────────────
echo ""
echo -e "  ${DIM}╔══════════════════════════════════════════════════════════════════╗${RST}"
echo -e "  ${DIM}║${RST}                                                                  ${DIM}║${RST}"
echo -e "  ${DIM}║${RST}   ${MAG}${BLD}◆  DEV SETUP CLI${RST}                              ${DIM}Installer${RST}   ${DIM}║${RST}"
echo -e "  ${DIM}║${RST}   ${DIM}Automated development environment installer for Linux${RST}          ${DIM}║${RST}"
echo -e "  ${DIM}║${RST}                                                                  ${DIM}║${RST}"
echo -e "  ${DIM}╠══════════════════════════════════════════════════════════════════╣${RST}"
echo -e "  ${DIM}║${RST}   #  ${DIM}github.com/${REPO}${RST}                                        ${DIM}║${RST}"
echo -e "  ${DIM}╚══════════════════════════════════════════════════════════════════╝${RST}"
echo ""

# ── System check ─────────────────────────────────────────────
if ! command -v curl &>/dev/null; then
  err "curl is required but not installed. Install it first: sudo apt-get install -y curl"
fi

OS="$(uname -s)"
if [[ "$OS" != "Linux" ]]; then
  err "This installer currently supports Linux only (detected: $OS)"
fi

# ── Download ──────────────────────────────────────────────────
say "Downloading latest release..."
say "${DIM}${DOWNLOAD_URL}${RST}"
echo ""

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

if ! curl -fsSL --progress-bar -o "$TMP_FILE" "$DOWNLOAD_URL"; then
  err "Download failed. Check your internet connection or visit: https://github.com/${REPO}/releases"
fi

# ── Install ───────────────────────────────────────────────────
say "Installing to ${INSTALL_DIR}/${BINARY}..."

mkdir -p "$INSTALL_DIR"
chmod +x "$TMP_FILE"
mv "$TMP_FILE" "${INSTALL_DIR}/${BINARY}"

ok "Installed to: ${BLD}${INSTALL_DIR}/${BINARY}${RST}"

# ── PATH check ────────────────────────────────────────────────
if [[ ":$PATH:" != *":${INSTALL_DIR}:"* ]]; then
  echo ""
  warn "${INSTALL_DIR} is not in your PATH."
  echo ""
  echo -e "  Add the following line to your ${BLD}~/.bashrc${RST} or ${BLD}~/.zshrc${RST}:"
  echo ""
  echo -e "    ${CYN}export PATH=\"\$HOME/.local/bin:\$PATH\"${RST}"
  echo ""
  echo -e "  Then reload your shell:"
  echo ""
  echo -e "    ${CYN}source ~/.bashrc${RST}   ${DIM}# or source ~/.zshrc${RST}"
  echo ""
fi

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "  ${DIM}┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄${RST}"
ok  "${BLD}Installation complete!${RST}"
echo ""
say "Get started:  ${BLD}${BINARY} --help${RST}"
say "Interactive:  ${BLD}${BINARY}${RST}"
say "Install all:  ${BLD}${BINARY} --all${RST}"
say "Preview only: ${BLD}${BINARY} --dry-run${RST}"
echo ""
