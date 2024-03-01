# Internxt CLI

[![Commands Unit Tests](https://github.com/internxt/cli/actions/workflows/commands-unit-tests.yml/badge.svg)](https://github.com/internxt/cli/actions/workflows/commands-unit-tests.yml)
[![CodeQL](https://github.com/internxt/cli/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/internxt/cli/actions/workflows/github-code-scanning/codeql)

A CLI tool to interact with yout Internxt encrypted files

<!-- toc -->
* [Internxt CLI](#internxt-cli)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @internxt/cli
$ internxt COMMAND
running command...
$ internxt (--version)
@internxt/cli/0.0.8 darwin-arm64 node-v20.10.0
$ internxt --help [COMMAND]
USAGE
  $ internxt COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`internxt download`](#internxt-download)
* [`internxt login`](#internxt-login)
* [`internxt logout`](#internxt-logout)
* [`internxt upload`](#internxt-upload)
* [`internxt whoami`](#internxt-whoami)

## `internxt download`

Download and decrypts a file from Internxt Drive to a directory. The file name will be the same as the file name in your Drive

```
USAGE
  $ internxt download --uuid <value> --directory <value> [--overwrite]

FLAGS
  --directory=<value>  (required) The directory to download the file to.
  --overwrite          Overwrite the file if it already exists
  --uuid=<value>       (required) The uuid of the file to download. Use internxt list to view your files uuids

DESCRIPTION
  Download and decrypts a file from Internxt Drive to a directory. The file name will be the same as the file name in
  your Drive

EXAMPLES
  $ internxt download
```

_See code: [src/commands/download.ts](https://github.com/internxt/cli/blob/v0.0.8/src/commands/download.ts)_

## `internxt login`

Logs into an Internxt account. If the account is two-factor protected, then an extra code will be required.

```
USAGE
  $ internxt login [-e <value>] [-p <value>] [-w <value>] [-n]

FLAGS
  -e, --email=<value>      The email to log in
  -p, --password=<value>   The plain password to log in
  -w, --two-factor=123456  The two factor auth code (only needed if the account is two-factor protected)

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Logs into an Internxt account. If the account is two-factor protected, then an extra code will be required.

EXAMPLES
  $ internxt login
```

_See code: [src/commands/login.ts](https://github.com/internxt/cli/blob/v0.0.8/src/commands/login.ts)_

## `internxt logout`

Logs out the current internxt user that is logged into the Internxt CLI.

```
USAGE
  $ internxt logout

DESCRIPTION
  Logs out the current internxt user that is logged into the Internxt CLI.

EXAMPLES
  $ internxt logout
```

_See code: [src/commands/logout.ts](https://github.com/internxt/cli/blob/v0.0.8/src/commands/logout.ts)_

## `internxt upload`

Upload a file to Internxt Drive

```
USAGE
  $ internxt upload --file <value> [--json] [--folderId <value>]

FLAGS
  --file=<value>      (required) The path to read the file in your system
  --folderId=<value>  The folder id to upload the file to

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Upload a file to Internxt Drive

EXAMPLES
  $ internxt upload
```

_See code: [src/commands/upload.ts](https://github.com/internxt/cli/blob/v0.0.8/src/commands/upload.ts)_

## `internxt whoami`

Displays the current user logged into the Internxt CLI.

```
USAGE
  $ internxt whoami

DESCRIPTION
  Displays the current user logged into the Internxt CLI.

EXAMPLES
  $ internxt whoami
```

_See code: [src/commands/whoami.ts](https://github.com/internxt/cli/blob/v0.0.8/src/commands/whoami.ts)_
<!-- commandsstop -->
