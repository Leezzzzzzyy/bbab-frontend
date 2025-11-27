#!/usr/bin/env bash
set -euo pipefail

# Server-side deploy script for Expo web (run this ON THE DEPLOY/REMOTE MACHINE)
#
# Overview:
# - clones (or updates) the git repo into DEPLOY_DIR
# - installs dependencies (npm ci / npm install)
# - runs a web build (tries sensible defaults; you can override BUILD_CMD)
# - rsyncs the build output into REMOTE_PATH (eg. /var/www/myapp)
# - fixes ownership/permissions and reloads nginx
#
# Configure by exporting env vars or editing the defaults below.

# --- CONFIG (edit or export before running) ---
GIT_REPO="${GIT_REPO:-https://github.com/Leezzzzzzyy/bbab-frontend.git}"                 # required: git repo URL, e.g. git@github.com:owner/repo.git
GIT_BRANCH="${GIT_BRANCH:-master}"         # branch to deploy
DEPLOY_BASE="${DEPLOY_BASE:-/srv/apps/myapp}"   # working area where repo is checked out
APP_DIR="${APP_DIR:-${DEPLOY_BASE}/repo}"       # actual repo path
REMOTE_PATH="${REMOTE_PATH:-/var/www/myapp}"    # where built static files will be served from
BUILD_DIR="${BUILD_DIR:-web-build}"     # expected build output dir relative to APP_DIR
BUILD_CMD="${BUILD_CMD:-npx expo export:web}"              # if set, this command will be used to build
NODE_ENV="${NODE_ENV:-production}"      # NODE_ENV for build
NPM_CMD="${NPM_CMD:-npm}"               # npm or yarn
KEEP_DEPLOY_HISTORY="${KEEP_DEPLOY_HISTORY:-3}" # number of past clones kept (unused here, placeholder)
# --- end config ---

if [ -z "${GIT_REPO}" ]; then
  echo "ERROR: GIT_REPO is not set. Export GIT_REPO=git@github.com:owner/repo.git and re-run."
  exit 2
fi

echo "Starting server-side deploy: $(date)"
echo "Repo: ${GIT_REPO}  Branch: ${GIT_BRANCH}"
echo "App dir: ${APP_DIR}"
echo "Build dir (relative): ${BUILD_DIR}"
echo "Publish target: ${REMOTE_PATH}"
echo

# helper
run_in_app() {
  (cd "${APP_DIR}" && eval "$*")
}

# Ensure DEPLOY_BASE exists and is writeable
mkdir -p "${DEPLOY_BASE}"
chown "$(id -u):$(id -g)" "${DEPLOY_BASE}" || true

# Clone or update repository
if [ ! -d "${APP_DIR}/.git" ]; then
  echo "Cloning repository..."
  git clone --branch "${GIT_BRANCH}" --depth 1 "${GIT_REPO}" "${APP_DIR}"
else
  echo "Updating existing repository..."
  run_in_app "git fetch --all --prune"
  run_in_app "git checkout --force ${GIT_BRANCH}"
  run_in_app "git reset --hard origin/${GIT_BRANCH}"
fi

# Ensure node is available
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found in PATH. Please install Node.js (14+ recommended) and re-run."
  exit 3
fi

echo "Node version: $(node --version)  npm version: $(npm --version || echo 'npm not found')"
export NODE_ENV="${NODE_ENV}"

# Install dependencies
echo "Installing dependencies..."
if [ -f "${APP_DIR}/package-lock.json" ] && command -v npm >/dev/null 2>&1; then
  run_in_app "npm ci --unsafe-perm"
elif [ -f "${APP_DIR}/yarn.lock" ] && command -v yarn >/dev/null 2>&1; then
  run_in_app "yarn install --frozen-lockfile"
else
  run_in_app "${NPM_CMD} install --no-audit --no-fund"
fi

# Build step
echo "Building web assets..."
BUILD_SUCCESS=1

if [ -n "${BUILD_CMD}" ]; then
  echo "Using custom BUILD_CMD: ${BUILD_CMD}"
  if run_in_app "${BUILD_CMD}"; then
    BUILD_SUCCESS=0
  else
    echo "Custom build command failed."
    BUILD_SUCCESS=1
  fi
else
  # Try a few common build commands for Expo web projects (tries in order).
  # If your Expo version needs a different command, set BUILD_CMD before running.
  echo "Trying common build commands (you can override by setting BUILD_CMD)."
  if run_in_app "npm run build:web"; then
    BUILD_SUCCESS=0
  elif run_in_app "npm run build"; then
    BUILD_SUCCESS=0
  elif run_in_app "npx expo export:web --no-dev --output ${BUILD_DIR}"; then
    BUILD_SUCCESS=0
  elif run_in_app "npx expo build:web"; then
    # NOTE: expo build:web in some setups may attempt cloud build; if so prefer export:web or npm script
    BUILD_SUCCESS=0
  else
    BUILD_SUCCESS=1
  fi
fi

if [ "${BUILD_SUCCESS}" -ne 0 ]; then
  echo "ERROR: web build failed. Inspect build logs above and adjust BUILD_CMD or project scripts."
  exit 4
fi

# Confirm build output exists
if [ ! -d "${APP_DIR}/${BUILD_DIR}" ]; then
  echo "ERROR: build output directory not found: ${APP_DIR}/${BUILD_DIR}"
  echo "List of files in app dir:"
  ls -la "${APP_DIR}"
  exit 5
fi

# Publish (rsync) build output to REMOTE_PATH
echo "Publishing build to ${REMOTE_PATH} ..."
mkdir -p "${REMOTE_PATH}"
# Use rsync if available, otherwise use cp -r
if command -v rsync >/dev/null 2>&1; then
  rsync -avz --delete --chmod=Da=rx,Dg=rx,Do=rx,Fa=rw,Fg=rw,Fo=rw "${APP_DIR}/${BUILD_DIR}/" "${REMOTE_PATH}/"
else
  echo "rsync not found, using cp -a fallback (no deletion of removed files)."
  cp -a "${APP_DIR}/${BUILD_DIR}/." "${REMOTE_PATH}/"
fi

# Fix permissions for web server (www-data)
echo "Fixing ownership/permissions (www-data:www-data)..."
if getent passwd www-data >/dev/null 2>&1; then
  chown -R www-data:www-data "${REMOTE_PATH}" || true
else
  echo "www-data user not found; leaving permissions as-is."
fi
chmod -R 755 "${REMOTE_PATH}" || true

# Validate and reload nginx if available
if command -v nginx >/dev/null 2>&1; then
  echo "Testing nginx config..."
  if sudo nginx -t; then
    echo "Reloading nginx..."
    sudo systemctl reload nginx || sudo service nginx reload || true
  else
    echo "nginx config test failed; please check /etc/nginx/sites-enabled and nginx error log."
  fi
else
  echo "nginx not installed on this server (or not in PATH). Skipping reload."
fi

echo "Deploy completed: $(date)"
echo "Served files at: ${REMOTE_PATH}"
echo
echo "Notes:"
echo "- If the git repo is private, ensure the deploy user has the SSH key / credentials needed to fetch."
echo "- To run manually: (on the deploy machine)"
echo "    export GIT_REPO='git@github.com:owner/repo.git' GIT_BRANCH=main REMOTE_PATH=/var/www/myapp ./deploy.sh"
echo "- If your Expo web build for this version requires a different command, set BUILD_CMD before running."
exit 0