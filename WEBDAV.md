# Internxt CLI WebDav support

The Internxt CLI comes with built in WebDav support.

## How it works

The WebDav feature works by exposing a local only server in your machine when enabled.

- When you download a file, the WebDav local server decrypts your data and sends it to the WebDav client
- When you upload a file, the WebDav local server encrypts your data and sends it to the Internxt servers

No plain data is being sent or is being pulled from the Internxt servers, you can view the whole Internxt CLI + WebDav architecture in the below diagram.

![image](https://raw.githubusercontent.com/internxt/cli/main/public/webdav-how-it-works.png)

## Officially supported WebDav clients

Below you can find a list of WebDav clients that we officially support in the Internxt CLI

|                       | Supported |
| --------------------- | --------- |
| Windows Explorer      | ✅        |
| MacOS Finder          | ✅        |
| CyberDuck for Windows | ✅        |
| CyberDuck for MacOS   | ✅        |
| Transmit              | ✅        |
| Cadaver               | ✅        |

## Supported WebDav methods

Find below the methods that are supported in the latest version of the Internxt CLI.

| Method    | Supported |
| --------- | --------- |
| OPTIONS   | ✅        |
| GET       | ✅        |
| HEAD      | ✅        |
| POST      | ❌        |
| PUT       | ✅        |
| DELETE    | ❌        |
| PROPFIND  | ✅        |
| PROPPATCH | ❌        |
| MKCOL     | ❌        |
| COPY      | ❌        |

## Usage

- Enable WebDav with `internxt webdav enable`
- Disable WebDav with `internxt webdav disable`

## Known issues

- We use selfsigned certificates, so all the requests to the WebDav local server are encrypted, since the certificates are selfsigned, many WebDav clients will complain about the certificates trust. You can safely ignore this warning.
