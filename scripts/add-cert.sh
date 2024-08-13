#!/bin/bash

CERT_PATH=$1

if [[ "$OSTYPE" == "darwin"* ]]; then
    sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERT_PATH
else
    sudo cp $CERT_PATH /usr/local/share/ca-certificates/
    sudo update-ca-certificates
fi