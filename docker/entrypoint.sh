#!/bin/sh

set -e

if [ -z "$INXT_USER" ] || [ -z "$INXT_PASSWORD" ]; then
  echo "Error: INXT_USER and INXT_PASSWORD environment variables must be set."
  exit 1
fi

LOGIN_CMD="internxt login -x -e=\"$INXT_USER\" -p=\"$INXT_PASSWORD\""

if [ -n "$INXT_OTPTOKEN" ]; then
  echo "Using 2FA secret token"
  LOGIN_CMD="$LOGIN_CMD -t=\"$INXT_OTPTOKEN\""
elif [ -n "$INXT_TWOFACTORCODE" ]; then
  echo "Using 2FA code"
  LOGIN_CMD="$LOGIN_CMD -w=\"$INXT_TWOFACTORCODE\""
fi

eval $LOGIN_CMD

internxt webdav enable

mkdir -p /root/.internxt-cli/logs
touch /root/.internxt-cli/logs/internxt-webdav-combined.log
tail -f /root/.internxt-cli/logs/internxt-webdav-combined.log
