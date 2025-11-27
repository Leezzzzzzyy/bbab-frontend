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
GIT_BRANCH="${GIT_BRANCH:-}"              # branch to deploy (leave empty to use current branch)
REMOTE_PATH="${REMOTE_PATH:-/var/www/myapp}"    # where built static files will be served from
BUILD_DIR="${BUILD_DIR:-dist}"     # expected build output dir relative to APP_DIR
BUILD_CMD="${BUILD_CMD:-npx expo export --platform 'web'}"              # if set, this command will be used to build
NODE_ENV="${NODE_ENV:-production}"      # NODE_ENV for build
NPM_CMD="${NPM_CMD:-npm}"               # npm or yarn
# --- end config ---

echo "Starting server-side deploy: $(date)"
echo "Build dir (relative): ${BUILD_DIR}"
echo "Publish target: ${REMOTE_PATH}"
echo


git fetch --all --prune
git reset --hard origin/master

# Install dependencies
echo "Installing dependencies..."
if [ -f "./package-lock.json" ] && command -v npm >/dev/null 2>&1; then
  npm ci --unsafe-perm
fi

# Build step
echo "Building web assets..."
BUILD_SUCCESS=1

npx expo export --platform 'web'

# Confirm build output exists
if [ ! -d "./${BUILD_DIR}" ]; then
  echo "ERROR: build output directory not found: ./${BUILD_DIR}"
  echo "List of files in app dir:"
  ls -la "."
  exit 5
fi

# Publish (rsync) build output to REMOTE_PATH
echo "Publishing build to ${REMOTE_PATH} ..."
mkdir -p "${REMOTE_PATH}"
# Use rsync if available, otherwise use cp -r
cp -a "./${BUILD_DIR}/." "${REMOTE_PATH}/"

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
echo "- This script runs in the current folder and uses the current git project."
echo "- To deploy a different branch: export GIT_BRANCH=branch-name ./deploy.sh"
echo "- To deploy to a different location: export REMOTE_PATH=/var/www/different-path ./deploy.sh"
echo "- If your Expo web build for this version requires a different command, set BUILD_CMD before running."
exit 0