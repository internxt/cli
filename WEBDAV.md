# Internxt CLI WebDav support

The Internxt CLI comes with built in WebDav support.

## How it works

When you login with Internxt CLI, your session and some other configuration data are stored in your local home folder. These data will be used for both the CLI and WebDAV. Restarting the computer or uninstalling the CLI will not erase this configuration. The only way to properly clean up this configuration is by explicitly using the logout command.

The WebDav feature works by exposing a local only server in your machine when enabled.

- When you download a file, the WebDav local server decrypts your data and sends it to the WebDav client
- When you upload a file, the WebDav local server encrypts your data and sends it to the Internxt servers

No plain data is being sent or is being pulled from the Internxt servers, you can view the whole Internxt CLI + WebDav architecture in the below diagram.

![image](https://raw.githubusercontent.com/internxt/cli/main/public/webdav-how-it-works.png)

## Officially supported WebDav clients

Below you can find a list of WebDav clients that we officially support in the Internxt CLI

|                       | Supported |
| --------------------- | --------- |
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
| MOVE      | ❌        |

## Usage

- Log into your account with `internxt login`
- Enable WebDav with `internxt webdav enable`
- Access to your files via WebDAV with your preferred client
- Disable WebDav with `internxt webdav disable`

## Known issues

- We use selfsigned certificates, so all the requests to the WebDav local server are encrypted, since the certificates are selfsigned, many WebDav clients will complain about the certificates trust. You can safely ignore this warning.
