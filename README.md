# Internxt CLI

[![Commands Unit Tests](https://github.com/internxt/cli/actions/workflows/commands-unit-tests.yml/badge.svg)](https://github.com/internxt/cli/actions/workflows/commands-unit-tests.yml)
[![CodeQL](https://github.com/internxt/cli/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/internxt/cli/actions/workflows/github-code-scanning/codeql)

A CLI tool to interact with yout Internxt encrypted files

<!-- toc -->
* [Internxt CLI](#internxt-cli)
* [Installation](#installation)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Installation

Binaries and specific installers are available in the latest release:

[View Internxt CLI latest release here](https://github.com/internxt/cli/releases/latest)

You can install the Internxt CLI in different ways:

### NPM

Requires Node >= 20.0.0

`npm i -g @internxt/cli`

# Usage

<!-- usage -->
```sh-session
$ npm install -g @internxt/cli
$ internxt COMMAND
running command...
$ internxt (--version)
@internxt/cli/0.1.19 darwin-arm64 node-v20.10.0
$ internxt --help [COMMAND]
USAGE
  $ internxt COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`internxt config`](#internxt-config)
* [`internxt download`](#internxt-download)
* [`internxt list`](#internxt-list)
* [`internxt login`](#internxt-login)
* [`internxt logout`](#internxt-logout)
* [`internxt logs`](#internxt-logs)
* [`internxt move`](#internxt-move)
* [`internxt trash`](#internxt-trash)
* [`internxt upload`](#internxt-upload)
* [`internxt webdav ACTION`](#internxt-webdav-action)
* [`internxt whoami`](#internxt-whoami)

## `internxt config`

Display useful information from the user logged into the Internxt CLI.

```
USAGE
  $ internxt config [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]]
    [--output csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -x, --extended         show extra columns
      --columns=<value>  only show provided columns (comma-separated)
      --csv              output is csv format [alias: --output=csv]
      --filter=<value>   filter property by partial string matching, ex: name=foo
      --no-header        hide table header from output
      --no-truncate      do not truncate output to fit screen
      --output=<option>  output in a more machine friendly format
                         <options: csv|json|yaml>
      --sort=<value>     property to sort by (prepend '-' for descending)

DESCRIPTION
  Display useful information from the user logged into the Internxt CLI.

EXAMPLES
  $ internxt config
```

_See code: [src/commands/config.ts](https://github.com/internxt/cli/blob/v0.1.19/src/commands/config.ts)_

## `internxt download`

Download and decrypts a file from Internxt Drive to a directory. The file name will be the same as the file name in your Drive

```
USAGE
  $ internxt download --id <value> --directory <value> [--overwrite]

FLAGS
  --directory=<value>  (required) The directory to download the file to.
  --id=<value>         (required) The id of the file to download. Use internxt list to view your files ids
  --overwrite          Overwrite the file if it already exists

DESCRIPTION
  Download and decrypts a file from Internxt Drive to a directory. The file name will be the same as the file name in
  your Drive

EXAMPLES
  $ internxt download
```

_See code: [src/commands/download.ts](https://github.com/internxt/cli/blob/v0.1.19/src/commands/download.ts)_

## `internxt list`

Lists the content of a folder id.

```
USAGE
  $ internxt list [-n] [-f <value>] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv |
    --no-truncate]] [--output csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -f, --id=<value>       The folder id to list. Leave empty for the root folder.
  -x, --extended         show extra columns
      --columns=<value>  only show provided columns (comma-separated)
      --csv              output is csv format [alias: --output=csv]
      --filter=<value>   filter property by partial string matching, ex: name=foo
      --no-header        hide table header from output
      --no-truncate      do not truncate output to fit screen
      --output=<option>  output in a more machine friendly format
                         <options: csv|json|yaml>
      --sort=<value>     property to sort by (prepend '-' for descending)

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Lists the content of a folder id.

EXAMPLES
  $ internxt list
```

_See code: [src/commands/list.ts](https://github.com/internxt/cli/blob/v0.1.19/src/commands/list.ts)_

## `internxt login`

Logs into an Internxt account. If the account is two-factor protected, then an extra code will be required.

```
USAGE
  $ internxt login [-n] [-e <value>] [-p <value>] [-w <value>]

FLAGS
  -e, --email=<value>     The email to log in
  -p, --password=<value>  The plain password to log in
  -w, --twofactor=123456  The two factor auth code (only needed if the account is two-factor protected)

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Logs into an Internxt account. If the account is two-factor protected, then an extra code will be required.

EXAMPLES
  $ internxt login
```

_See code: [src/commands/login.ts](https://github.com/internxt/cli/blob/v0.1.19/src/commands/login.ts)_

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

_See code: [src/commands/logout.ts](https://github.com/internxt/cli/blob/v0.1.19/src/commands/logout.ts)_

## `internxt logs`

Displays the Internxt CLI logs directory path

```
USAGE
  $ internxt logs

DESCRIPTION
  Displays the Internxt CLI logs directory path

EXAMPLES
  $ internxt logs
```

_See code: [src/commands/logs.ts](https://github.com/internxt/cli/blob/v0.1.19/src/commands/logs.ts)_

## `internxt move`

Move a folder/file into a destination folder.

```
USAGE
  $ internxt move [-n] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The destination folder id where the item is going to be moved.
  -i, --id=<value>           The item id to be moved (it can be a file id or a folder id).

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Move a folder/file into a destination folder.

EXAMPLES
  $ internxt move
```

_See code: [src/commands/move.ts](https://github.com/internxt/cli/blob/v0.1.19/src/commands/move.ts)_

## `internxt trash`

Moves a given folder/file to the trash.

```
USAGE
  $ internxt trash [-n] [-i <value>]

FLAGS
  -i, --id=<value>  The item id to be trashed (it can be a file id or a folder id).

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Moves a given folder/file to the trash.

EXAMPLES
  $ internxt trash
```

_See code: [src/commands/trash.ts](https://github.com/internxt/cli/blob/v0.1.19/src/commands/trash.ts)_

## `internxt upload`

Upload a file to Internxt Drive

```
USAGE
  $ internxt upload --file <value> [--json] [--id <value>]

FLAGS
  --file=<value>  (required) The path to read the file in your system
  --id=<value>    The folder id to upload the file to

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Upload a file to Internxt Drive

EXAMPLES
  $ internxt upload
```

_See code: [src/commands/upload.ts](https://github.com/internxt/cli/blob/v0.1.19/src/commands/upload.ts)_

## `internxt webdav ACTION`

Enable or disable the Internxt CLI WebDav server

```
USAGE
  $ internxt webdav ACTION

DESCRIPTION
  Enable or disable the Internxt CLI WebDav server

EXAMPLES
  $ internxt webdav
```

_See code: [src/commands/webdav.ts](https://github.com/internxt/cli/blob/v0.1.19/src/commands/webdav.ts)_

## `internxt whoami`

Display the current user logged into the Internxt CLI.

```
USAGE
  $ internxt whoami

DESCRIPTION
  Display the current user logged into the Internxt CLI.

EXAMPLES
  $ internxt whoami
```

_See code: [src/commands/whoami.ts](https://github.com/internxt/cli/blob/v0.1.19/src/commands/whoami.ts)_
<!-- commandsstop -->
