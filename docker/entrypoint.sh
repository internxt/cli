#!/bin/sh

set -e

if [ -z "$INXT_USER" ] || [ -z "$INXT_PASSWORD" ]; then
  echo "Error: INXT_USER and INXT_PASSWORD environment variables must be set."
  exit 1
fi


echo "Logging into your account [$INXT_USER]"

LOGIN_CMD="internxt login -x -e=\"$INXT_USER\" -p=\"$INXT_PASSWORD\""

if [ -n "$INXT_OTPTOKEN" ]; then
  echo "Using 2FA secret token"
  LOGIN_CMD="$LOGIN_CMD -t=\"$INXT_OTPTOKEN\""
elif [ -n "$INXT_TWOFACTORCODE" ]; then
  echo "Using 2FA code"
  LOGIN_CMD="$LOGIN_CMD -w=\"$INXT_TWOFACTORCODE\""
fi

eval $LOGIN_CMD


WEBDAV_CMD="internxt webdav-config -l='0.0.0.0'"

if [ -n "$WEBDAV_PORT" ]; then
  WEBDAV_CMD="$WEBDAV_CMD -p=$WEBDAV_PORT"
fi

proto=$(echo "$WEBDAV_PROTOCOL" | tr '[:upper:]' '[:lower:]')
if [ "$proto" = "http" ]; then
  WEBDAV_CMD="$WEBDAV_CMD -h"
elif [ "$proto" = "https" ]; then
  WEBDAV_CMD="$WEBDAV_CMD -s"
fi

eval $WEBDAV_CMD

internxt webdav enable

mkdir -p /root/.internxt-cli/logs
touch /root/.internxt-cli/logs/internxt-webdav-combined.log
tail -f /root/.internxt-cli/logs/internxt-webdav-combined.log
