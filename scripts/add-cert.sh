#!/bin/bash

CERT_PATH="$1"

if [[ -z "$CERT_PATH" ]]; then
    echo "Usage: $0 path_to_certificate"
    exit 1
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
    sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CERT_PATH"
elif [[ -d "/usr/local/share/ca-certificates/" ]]; then # For Debian-based distributions
    sudo cp "$CERT_PATH" /usr/local/share/ca-certificates/
    sudo update-ca-certificates
elif [[ -d "/etc/pki/ca-trust/source/anchors/" ]]; then # For Fedora-based distribution
    sudo cp "$CERT_PATH" /etc/pki/ca-trust/source/anchors/
    sudo update-ca-trust -i
elif [[ -d "/etc/ca-certificates/trust-source/anchors/" ]]; then # For Arch Linux and derivatives
    sudo cp "$CERT_PATH" /etc/ca-certificates/trust-source/anchors/
    sudo trust extract-compat
else
    echo "Local certificates folder not found"
    exit 1
fi
