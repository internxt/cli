#!/bin/sh

set -e

login() {
  echo "[login] Logging into your account [$INXT_USER]..."
  internxt login-legacy $LOGIN_ARGS
}

webdav_enable() {
  internxt webdav enable
}

session_alive() {
  WHOAMI_OUTPUT=$(internxt whoami --json 2>/dev/null || true)
  WHOAMI_EMAIL=$(echo "$WHOAMI_OUTPUT" | jq -r '.login.user.email // empty' | tr '[:upper:]' '[:lower:]')
  INXT_USER_LOWER=$(echo "$INXT_USER" | tr '[:upper:]' '[:lower:]')
  [ -n "$WHOAMI_EMAIL" ] && [ "$WHOAMI_EMAIL" = "$INXT_USER_LOWER" ]
}

relogin() {
  LOGIN_OUTPUT=$(internxt login-legacy $LOGIN_ARGS --json 2>/dev/null)
}

# $1: JSON output of a CLI command run with --json
version_blocked() {
  [ "$(echo "$1" | jq -r '.code // empty' 2>/dev/null)" = "CLIENT_VERSION_UNSUPPORTED" ]
}

webdav_online() {
  STATUS_OUTPUT=$(internxt webdav status --json 2>/dev/null || true)
  WEBDAV_STATUS=$(echo "$STATUS_OUTPUT" | jq -r '.message | split(" ") | last // empty')
  [ "$WEBDAV_STATUS" = "online" ]
}


echo "[entrypoint] $(internxt --version 2>/dev/null || echo 'internxt version unknown')"

if [ -z "$INXT_USER" ] || [ -z "$INXT_PASSWORD" ]; then
  echo "Error: INXT_USER and INXT_PASSWORD environment variables must be set."
  exit 1
fi

LOGIN_ARGS="-x -e=$INXT_USER -p=$INXT_PASSWORD"

if [ -n "$INXT_OTPTOKEN" ]; then
  echo "Using 2FA secret token"
  LOGIN_ARGS="$LOGIN_ARGS -t=$INXT_OTPTOKEN"
elif [ -n "$INXT_TWOFACTORCODE" ]; then
  echo "Using 2FA code"
  LOGIN_ARGS="$LOGIN_ARGS -w=$INXT_TWOFACTORCODE"
fi

login

WEBDAV_ARGS="-l=0.0.0.0"

if [ -n "$WEBDAV_PORT" ]; then
  WEBDAV_ARGS="$WEBDAV_ARGS -p=$WEBDAV_PORT"
fi

proto=$(echo "$WEBDAV_PROTOCOL" | tr '[:upper:]' '[:lower:]')
if [ "$proto" = "http" ]; then
  WEBDAV_ARGS="$WEBDAV_ARGS -h"
elif [ "$proto" = "https" ]; then
  WEBDAV_ARGS="$WEBDAV_ARGS -s"
fi

customAuth=$(echo "$WEBDAV_CUSTOM_AUTH" | tr '[:upper:]' '[:lower:]')
if [ "$customAuth" = "true" ] || [ "$customAuth" = "1" ] || [ "$customAuth" = "yes" ] || [ "$customAuth" = "y" ]; then
  if [ -z "$WEBDAV_USERNAME" ] || [ -z "$WEBDAV_PASSWORD" ]; then
    echo "Error: WEBDAV_USERNAME and WEBDAV_PASSWORD must be set when WEBDAV_CUSTOM_AUTH is enabled."
    exit 1
  fi
  echo "Enabling custom WebDAV authentication for user: $WEBDAV_USERNAME"
  WEBDAV_ARGS="$WEBDAV_ARGS --customAuth -u=$WEBDAV_USERNAME -w=$WEBDAV_PASSWORD"
fi

deleteFilesPermanently=$(echo "$WEBDAV_DELETE_FILES_PERMANENTLY" | tr '[:upper:]' '[:lower:]')
if [ "$deleteFilesPermanently" = "true" ] || [ "$deleteFilesPermanently" = "1" ] || [ "$deleteFilesPermanently" = "yes" ] || [ "$deleteFilesPermanently" = "y" ]; then
  echo "WARNING: Permanent file deletion is enabled. Deleted files will NOT be recoverable."
  WEBDAV_ARGS="$WEBDAV_ARGS -d"
fi

internxt webdav-config $WEBDAV_ARGS

webdav_enable

mkdir -p /root/.internxt-cli/logs
touch /root/.internxt-cli/logs/internxt-webdav-combined.log

# Stream the WebDAV server log to the container's stdout in the background.
tail -f /root/.internxt-cli/logs/internxt-webdav-combined.log &

# Keep-alive loop (runs in the foreground, as PID 1): periodically verify the
# session and WebDAV server, and re-authenticate if needed.
# WEBDAV_KEEPALIVE_ENABLED controls what happens on failure: when enabled (default),
# it self-heals by re-authenticating.
# When disabled, checks still run, but instead of self-healing, this process
# exits on failure so that Docker's restart policy (e.g. --restart unless-stopped)
# can recover the container with a clean login.
set +e
KEEPALIVE_INTERVAL=30

keepaliveEnabled=$(echo "$WEBDAV_KEEPALIVE_ENABLED" | tr '[:upper:]' '[:lower:]')
if [ -z "$WEBDAV_KEEPALIVE_ENABLED" ] || [ "$keepaliveEnabled" = "true" ] || [ "$keepaliveEnabled" = "1" ] || [ "$keepaliveEnabled" = "yes" ] || [ "$keepaliveEnabled" = "y" ]; then
  AUTO_HEAL=true
else
  AUTO_HEAL=false
fi

# $1: failure reason, prefixed to the standard stop message
stop_if_no_autoheal() {
  if [ "$AUTO_HEAL" != true ]; then
    echo "[keepalive] ERROR: $1 and WEBDAV_KEEPALIVE_ENABLED=false (auto-renewal disabled). Stopping container so it can be restarted."
    exit 1
  fi
}

# $1: JSON output carrying the version error. The flag only dedupes the log;
# checks keep running so a lifted block self-heals.
handle_version_blocked() {
  if [ "$VERSION_BLOCKED" = false ]; then
    echo "[keepalive] ERROR: $(echo "$1" | jq -r '.message')"
    VERSION_BLOCKED=true
  fi
  stop_if_no_autoheal "Client version unsupported"
}

VERSION_BLOCKED=false

while true; do
  sleep "$KEEPALIVE_INTERVAL"

  if session_alive; then
    VERSION_BLOCKED=false
  elif version_blocked "$WHOAMI_OUTPUT"; then
    handle_version_blocked "$WHOAMI_OUTPUT"
  else
    stop_if_no_autoheal "Session expired"
    if [ "$VERSION_BLOCKED" = false ]; then
      echo "[keepalive] Session expired. Re-authenticating..."
    fi
    if relogin; then
      VERSION_BLOCKED=false
      if webdav_enable; then
        echo "[keepalive] Session restored."
      else
        echo "[keepalive] ERROR: Logged in, but the WebDAV server failed to start. Retrying in ${KEEPALIVE_INTERVAL}s."
      fi
    elif version_blocked "$LOGIN_OUTPUT"; then
      handle_version_blocked "$LOGIN_OUTPUT"
    else
      echo "[keepalive] ERROR: Re-authentication failed: $(echo "$LOGIN_OUTPUT" | jq -r '.message // empty' 2>/dev/null). Retrying in ${KEEPALIVE_INTERVAL}s."
    fi
  fi

  if ! webdav_online; then
    stop_if_no_autoheal "WebDAV server is not online"
    echo "[keepalive] WebDAV server is not online. Re-enabling..."
    if webdav_enable; then
      echo "[keepalive] WebDAV server re-enabled."
    else
      echo "[keepalive] ERROR: Failed to re-enable the WebDAV server. Retrying in ${KEEPALIVE_INTERVAL}s."
    fi
  fi
done
