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
@internxt/cli/0.0.12 darwin-arm64 node-v20.10.0
$ internxt --help [COMMAND]
USAGE
  $ internxt COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`internxt download`](#internxt-download)
* [`internxt list`](#internxt-list)
* [`internxt login`](#internxt-login)
* [`internxt logout`](#internxt-logout)
* [`internxt upload`](#internxt-upload)
* [`internxt whoami`](#internxt-whoami)

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

_See code: [src/commands/download.ts](https://github.com/internxt/cli/blob/v0.0.12/src/commands/download.ts)_

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

_See code: [src/commands/list.ts](https://github.com/internxt/cli/blob/v0.0.12/src/commands/list.ts)_

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

_See code: [src/commands/login.ts](https://github.com/internxt/cli/blob/v0.0.12/src/commands/login.ts)_

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

_See code: [src/commands/logout.ts](https://github.com/internxt/cli/blob/v0.0.12/src/commands/logout.ts)_

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

_See code: [src/commands/upload.ts](https://github.com/internxt/cli/blob/v0.0.12/src/commands/upload.ts)_

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

_See code: [src/commands/whoami.ts](https://github.com/internxt/cli/blob/v0.0.12/src/commands/whoami.ts)_
<!-- commandsstop -->
