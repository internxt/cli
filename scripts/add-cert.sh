#!/bin/bash

CERT_PATH=$1

if [[ "$OSTYPE" == "darwin"* ]]; then
    sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERT_PATH
elif ! [[ -d "/usr/local/share/ca-certificates/" ]]; then # For Fedora distribution
    sudo cp $CERT_PATH /etc/pki/ca-trust/source/anchors/
    sudo update-ca-trust
else
    sudo cp $CERT_PATH /usr/local/share/ca-certificates/
    sudo update-ca-certificates
fi
