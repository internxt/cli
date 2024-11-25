# Internxt CLI

[![Commands Unit Tests](https://github.com/internxt/cli/actions/workflows/commands-unit-tests.yml/badge.svg)](https://github.com/internxt/cli/actions/workflows/commands-unit-tests.yml)
[![CodeQL](https://github.com/internxt/cli/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/internxt/cli/actions/workflows/github-code-scanning/codeql)

A CLI tool to interact with your Internxt encrypted files

<!-- toc -->
* [Internxt CLI](#internxt-cli)
* [Installation](#installation)
* [Usage](#usage)
* [Commands](#commands)
* [Current Limitations](#current-limitations)
<!-- tocstop -->

# Installation

You can install the Internxt CLI by using NPM:

Requires Node >= 20.0.0

`npm i -g @internxt/cli`

[View Internxt CLI latest release here](https://www.npmjs.com/package/@internxt/cli)

# Usage

<!-- usage -->
```sh-session
$ npm install -g @internxt/cli
$ internxt COMMAND
running command...
$ internxt (--version)
@internxt/cli/1.3.1 darwin-x64 node-v20.12.2
$ internxt --help [COMMAND]
USAGE
  $ internxt COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`internxt add-cert`](#internxt-add-cert)
* [`internxt config`](#internxt-config)
* [`internxt create-folder`](#internxt-create-folder)
* [`internxt download`](#internxt-download)
* [`internxt list`](#internxt-list)
* [`internxt login`](#internxt-login)
* [`internxt logout`](#internxt-logout)
* [`internxt logs`](#internxt-logs)
* [`internxt move-file`](#internxt-move-file)
* [`internxt move-folder`](#internxt-move-folder)
* [`internxt move file`](#internxt-move-file)
* [`internxt move folder`](#internxt-move-folder)
* [`internxt rename`](#internxt-rename)
* [`internxt trash`](#internxt-trash)
* [`internxt trash-clear`](#internxt-trash-clear)
* [`internxt trash-list`](#internxt-trash-list)
* [`internxt trash-restore-file`](#internxt-trash-restore-file)
* [`internxt trash-restore-folder`](#internxt-trash-restore-folder)
* [`internxt trash clear`](#internxt-trash-clear)
* [`internxt trash list`](#internxt-trash-list)
* [`internxt trash restore file`](#internxt-trash-restore-file)
* [`internxt trash restore folder`](#internxt-trash-restore-folder)
* [`internxt upload`](#internxt-upload)
* [`internxt webdav ACTION`](#internxt-webdav-action)
* [`internxt webdav-config ACTION`](#internxt-webdav-config-action)
* [`internxt whoami`](#internxt-whoami)

## `internxt add-cert`

Add a self-signed certificate to the trusted store for macOS, Linux, and Windows.

```
USAGE
  $ internxt add-cert

DESCRIPTION
  Add a self-signed certificate to the trusted store for macOS, Linux, and Windows.

EXAMPLES
  $ internxt add-cert
```

_See code: [src/commands/add-cert.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/add-cert.ts)_

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

_See code: [src/commands/config.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/config.ts)_

## `internxt create-folder`

Create a folder in your Internxt Drive

```
USAGE
  $ internxt create-folder --name <value> [--id <value>]

FLAGS
  --id=<value>    The folder id to create the folder in, defaults to your root folder
  --name=<value>  (required) The new folder name

DESCRIPTION
  Create a folder in your Internxt Drive

EXAMPLES
  $ internxt create-folder
```

_See code: [src/commands/create-folder.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/create-folder.ts)_

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

_See code: [src/commands/download.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/download.ts)_

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

_See code: [src/commands/list.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/list.ts)_

## `internxt login`

Logs into an Internxt account. If the account is two-factor protected, then an extra code will be required.

```
USAGE
  $ internxt login [-n] [-e <value>] [-p <value>] [-w 123456]

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

_See code: [src/commands/login.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/login.ts)_

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

_See code: [src/commands/logout.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/logout.ts)_

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

_See code: [src/commands/logs.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/logs.ts)_

## `internxt move-file`

Move a file into a destination folder.

```
USAGE
  $ internxt move-file [-n] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The destination folder id where the file is going to be moved.
  -i, --id=<value>           The file id to be moved.

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Move a file into a destination folder.

ALIASES
  $ internxt move file

EXAMPLES
  $ internxt move-file
```

_See code: [src/commands/move-file.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/move-file.ts)_

## `internxt move-folder`

Move a folder into a destination folder.

```
USAGE
  $ internxt move-folder [-n] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The destination folder id where the folder is going to be moved.
  -i, --id=<value>           The folder id to be moved.

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Move a folder into a destination folder.

ALIASES
  $ internxt move folder

EXAMPLES
  $ internxt move-folder
```

_See code: [src/commands/move-folder.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/move-folder.ts)_

## `internxt move file`

Move a file into a destination folder.

```
USAGE
  $ internxt move file [-n] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The destination folder id where the file is going to be moved.
  -i, --id=<value>           The file id to be moved.

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Move a file into a destination folder.

ALIASES
  $ internxt move file

EXAMPLES
  $ internxt move file
```

## `internxt move folder`

Move a folder into a destination folder.

```
USAGE
  $ internxt move folder [-n] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The destination folder id where the folder is going to be moved.
  -i, --id=<value>           The folder id to be moved.

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Move a folder into a destination folder.

ALIASES
  $ internxt move folder

EXAMPLES
  $ internxt move folder
```

## `internxt rename`

Rename a folder/file.

```
USAGE
  $ internxt rename [-n] [-i <value>] [-n <value>]

FLAGS
  -i, --id=<value>    The ID of the item to rename (can be a file ID or a folder ID).
  -n, --name=<value>  The new name for the item.

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Rename a folder/file.

EXAMPLES
  $ internxt rename
```

_See code: [src/commands/rename.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/rename.ts)_

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

_See code: [src/commands/trash.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/trash.ts)_

## `internxt trash-clear`

Deletes permanently all the content of the trash. This action cannot be undone.

```
USAGE
  $ internxt trash-clear [-n] [-f]

FLAGS
  -f, --force  It forces the trash to be emptied without confirmation.

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Deletes permanently all the content of the trash. This action cannot be undone.

ALIASES
  $ internxt trash clear

EXAMPLES
  $ internxt trash-clear
```

_See code: [src/commands/trash-clear.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/trash-clear.ts)_

## `internxt trash-list`

Lists the content of the trash.

```
USAGE
  $ internxt trash-list [-n] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]]
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

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Lists the content of the trash.

ALIASES
  $ internxt trash list

EXAMPLES
  $ internxt trash-list
```

_See code: [src/commands/trash-list.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/trash-list.ts)_

## `internxt trash-restore-file`

Restore a trashed file into a destination folder.

```
USAGE
  $ internxt trash-restore-file [-n] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The folder id where the file is going to be restored. Leave empty for the root folder.
  -i, --id=<value>           The file id to be restored from the trash.

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Restore a trashed file into a destination folder.

ALIASES
  $ internxt trash restore file

EXAMPLES
  $ internxt trash-restore-file
```

_See code: [src/commands/trash-restore-file.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/trash-restore-file.ts)_

## `internxt trash-restore-folder`

Restore a trashed folder into a destination folder.

```
USAGE
  $ internxt trash-restore-folder [-n] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The folder id where the folder is going to be restored. Leave empty for the root folder.
  -i, --id=<value>           The folder id to be restored from the trash.

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Restore a trashed folder into a destination folder.

ALIASES
  $ internxt trash restore folder

EXAMPLES
  $ internxt trash-restore-folder
```

_See code: [src/commands/trash-restore-folder.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/trash-restore-folder.ts)_

## `internxt trash clear`

Deletes permanently all the content of the trash. This action cannot be undone.

```
USAGE
  $ internxt trash clear [-n] [-f]

FLAGS
  -f, --force  It forces the trash to be emptied without confirmation.

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Deletes permanently all the content of the trash. This action cannot be undone.

ALIASES
  $ internxt trash clear

EXAMPLES
  $ internxt trash clear
```

## `internxt trash list`

Lists the content of the trash.

```
USAGE
  $ internxt trash list [-n] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]]
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

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Lists the content of the trash.

ALIASES
  $ internxt trash list

EXAMPLES
  $ internxt trash list
```

## `internxt trash restore file`

Restore a trashed file into a destination folder.

```
USAGE
  $ internxt trash restore file [-n] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The folder id where the file is going to be restored. Leave empty for the root folder.
  -i, --id=<value>           The file id to be restored from the trash.

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Restore a trashed file into a destination folder.

ALIASES
  $ internxt trash restore file

EXAMPLES
  $ internxt trash restore file
```

## `internxt trash restore folder`

Restore a trashed folder into a destination folder.

```
USAGE
  $ internxt trash restore folder [-n] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The folder id where the folder is going to be restored. Leave empty for the root folder.
  -i, --id=<value>           The folder id to be restored from the trash.

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Restore a trashed folder into a destination folder.

ALIASES
  $ internxt trash restore folder

EXAMPLES
  $ internxt trash restore folder
```

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

_See code: [src/commands/upload.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/upload.ts)_

## `internxt webdav ACTION`

Enable, disable, restart or get the status of the Internxt CLI WebDav server

```
USAGE
  $ internxt webdav ACTION

DESCRIPTION
  Enable, disable, restart or get the status of the Internxt CLI WebDav server

EXAMPLES
  $ internxt webdav enable

  $ internxt webdav disable

  $ internxt webdav restart

  $ internxt webdav status
```

_See code: [src/commands/webdav.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/webdav.ts)_

## `internxt webdav-config ACTION`

Edit the configuration of the Internxt CLI WebDav server as the port or the protocol.

```
USAGE
  $ internxt webdav-config ACTION [-n] [-p <value>]

FLAGS
  -p, --port=<value>  The new port that the WebDAV server is going to be have.

HELPER FLAGS
  -n, --non-interactive  Blocks the cli from being interactive. If passed, the cli will not request data through the
                         console and will throw errors directly

DESCRIPTION
  Edit the configuration of the Internxt CLI WebDav server as the port or the protocol.

EXAMPLES
  $ internxt webdav-config set-http

  $ internxt webdav-config set-https

  $ internxt webdav-config change-port
```

_See code: [src/commands/webdav-config.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/webdav-config.ts)_

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

_See code: [src/commands/whoami.ts](https://github.com/internxt/cli/blob/v1.3.1/src/commands/whoami.ts)_
<!-- commandsstop -->

# Current Limitations

- We currently have a 5GB size upload limitation per file for both, CLI and WebDAV
