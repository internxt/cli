#!/bin/sh

set -e

if [ -z "$INXT_USER" ] || [ -z "$INXT_PASSWORD" ]; then
  echo "Error: INXT_USER and INXT_PASSWORD environment variables must be set."
  exit 1
fi


echo "Logging into your account [$INXT_USER] using legacy authentication..."

LOGIN_ARGS="-x -e=$INXT_USER -p=$INXT_PASSWORD"

if [ -n "$INXT_OTPTOKEN" ]; then
  echo "Using 2FA secret token"
  LOGIN_ARGS="$LOGIN_ARGS -t=$INXT_OTPTOKEN"
elif [ -n "$INXT_TWOFACTORCODE" ]; then
  echo "Using 2FA code"
  LOGIN_ARGS="$LOGIN_ARGS -w=$INXT_TWOFACTORCODE"
fi

internxt login-legacy $LOGIN_ARGS

if [ -n "$INXT_WORKSPACE_ID" ]; then
  echo "Switching to workspace: $INXT_WORKSPACE_ID"
  internxt workspaces use -i="$INXT_WORKSPACE_ID"
fi


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

internxt webdav-config $WEBDAV_ARGS

internxt webdav enable

mkdir -p /root/.internxt-cli/logs
touch /root/.internxt-cli/logs/internxt-webdav-combined.log
tail -f /root/.internxt-cli/logs/internxt-webdav-combined.log
