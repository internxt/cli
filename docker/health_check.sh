#!/bin/sh

set -e

# Check login
WHOAMI_OUTPUT=$(internxt whoami --json 2>/dev/null || true)
WHOAMI_EMAIL=$(echo "$WHOAMI_OUTPUT" | jq -r '.login.user.email // empty' | tr '[:upper:]' '[:lower:]')
INXT_USER_LOWER=$(echo "$INXT_USER" | tr '[:upper:]' '[:lower:]')

# Check WebDAV status
STATUS_OUTPUT=$(internxt webdav status --json 2>/dev/null || true)
WEBDAV_STATUS=$(echo "$STATUS_OUTPUT" | jq -r '.message | split(" ") | last // empty')

if [ -n "$WHOAMI_EMAIL" ] && [ "$WHOAMI_EMAIL" = "$INXT_USER_LOWER" ] && [ "$WEBDAV_STATUS" = "online" ]; then
  echo "Healthcheck passed. User: $INXT_USER, WebDAV status: $WEBDAV_STATUS"
  exit 0
else
  echo "Healthcheck failed. Expected user: $INXT_USER, got: $WHOAMI_EMAIL. WebDAV status: $WEBDAV_STATUS"
  exit 1
fi
