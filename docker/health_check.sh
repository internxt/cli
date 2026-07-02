#!/bin/sh

set -e

# Check login
WHOAMI_OUTPUT=$(internxt whoami --json 2>/dev/null || true)
WHOAMI_EMAIL=$(echo "$WHOAMI_OUTPUT" | jq -r '.login.user.email // empty')

PORT="${WEBDAV_PORT:-3005}"

# Check the WebDAV listener. A TCP connection is enough here; protocol may be HTTP or HTTPS.
if node -e "const net = require('node:net'); const socket = net.createConnection({ host: '127.0.0.1', port: Number(process.env.WEBDAV_PORT || 3005) }, () => { socket.destroy(); process.exit(0); }); socket.setTimeout(2000); socket.on('timeout', () => { socket.destroy(); process.exit(1); }); socket.on('error', () => process.exit(1));"; then
  WEBDAV_STATUS="online"
else
  WEBDAV_STATUS="offline"
fi

if [ "$WHOAMI_EMAIL" = "$INXT_USER" ] && [ "$WEBDAV_STATUS" = "online" ]; then
  echo "Healthcheck passed. User: $INXT_USER, WebDAV status: $WEBDAV_STATUS"
  exit 0
else
  echo "Healthcheck failed. Expected user: $INXT_USER, got: $WHOAMI_EMAIL. WebDAV status: $WEBDAV_STATUS"
  exit 1
fi
