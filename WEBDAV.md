# Internxt CLI WebDav support

The Internxt CLI comes with built in WebDav support.

## Officially supported WebDav clients

Below you can find a list that we officially support in the Internxt CLI

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
