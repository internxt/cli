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

Requires Node >= 22.12.0

`npm i -g @internxt/cli`

[View Internxt CLI latest release here](https://www.npmjs.com/package/@internxt/cli)

# Usage

<!-- usage -->
```sh-session
$ npm install -g @internxt/cli
$ internxt COMMAND
running command...
$ internxt (--version)
@internxt/cli/1.5.3 win32-x64 node-v23.7.0
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
* [`internxt delete-permanently-file`](#internxt-delete-permanently-file)
* [`internxt delete-permanently-folder`](#internxt-delete-permanently-folder)
* [`internxt delete permanently file`](#internxt-delete-permanently-file)
* [`internxt delete permanently folder`](#internxt-delete-permanently-folder)
* [`internxt download-file`](#internxt-download-file)
* [`internxt download file`](#internxt-download-file)
* [`internxt list`](#internxt-list)
* [`internxt login`](#internxt-login)
* [`internxt logout`](#internxt-logout)
* [`internxt logs`](#internxt-logs)
* [`internxt move-file`](#internxt-move-file)
* [`internxt move-folder`](#internxt-move-folder)
* [`internxt move file`](#internxt-move-file)
* [`internxt move folder`](#internxt-move-folder)
* [`internxt rename-file`](#internxt-rename-file)
* [`internxt rename-folder`](#internxt-rename-folder)
* [`internxt rename file`](#internxt-rename-file)
* [`internxt rename folder`](#internxt-rename-folder)
* [`internxt trash-clear`](#internxt-trash-clear)
* [`internxt trash-file`](#internxt-trash-file)
* [`internxt trash-folder`](#internxt-trash-folder)
* [`internxt trash-list`](#internxt-trash-list)
* [`internxt trash-restore-file`](#internxt-trash-restore-file)
* [`internxt trash-restore-folder`](#internxt-trash-restore-folder)
* [`internxt trash clear`](#internxt-trash-clear)
* [`internxt trash file`](#internxt-trash-file)
* [`internxt trash folder`](#internxt-trash-folder)
* [`internxt trash list`](#internxt-trash-list)
* [`internxt trash restore file`](#internxt-trash-restore-file)
* [`internxt trash restore folder`](#internxt-trash-restore-folder)
* [`internxt upload-file`](#internxt-upload-file)
* [`internxt upload file`](#internxt-upload-file)
* [`internxt webdav ACTION`](#internxt-webdav-action)
* [`internxt webdav-config`](#internxt-webdav-config)
* [`internxt whoami`](#internxt-whoami)

## `internxt add-cert`

Add a self-signed certificate to the trusted store for macOS, Linux, and Windows.

```
USAGE
  $ internxt add-cert [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Add a self-signed certificate to the trusted store for macOS, Linux, and Windows.

EXAMPLES
  $ internxt add-cert
```

_See code: [src/commands/add-cert.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/add-cert.ts)_

## `internxt config`

Display useful information from the user logged into the Internxt CLI.

```
USAGE
  $ internxt config [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Display useful information from the user logged into the Internxt CLI.

EXAMPLES
  $ internxt config
```

_See code: [src/commands/config.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/config.ts)_

## `internxt create-folder`

Create a folder in your Internxt Drive

```
USAGE
  $ internxt create-folder [--json] [-x] [-n <value>] [-i <value>]

FLAGS
  -i, --id=<value>    The ID of the folder where the new folder will be created. Defaults to your root folder if not
                      specified.
  -n, --name=<value>  The new name for the folder

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Create a folder in your Internxt Drive

EXAMPLES
  $ internxt create-folder
```

_See code: [src/commands/create-folder.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/create-folder.ts)_

## `internxt delete-permanently-file`

Deletes permanently a file. This action cannot be undone.

```
USAGE
  $ internxt delete-permanently-file [--json] [-x] [-i <value>]

FLAGS
  -i, --id=<value>  The file id to be permanently deleted.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Deletes permanently a file. This action cannot be undone.

ALIASES
  $ internxt delete permanently file

EXAMPLES
  $ internxt delete-permanently-file
```

_See code: [src/commands/delete-permanently-file.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/delete-permanently-file.ts)_

## `internxt delete-permanently-folder`

Deletes permanently a folder. This action cannot be undone.

```
USAGE
  $ internxt delete-permanently-folder [--json] [-x] [-i <value>]

FLAGS
  -i, --id=<value>  The folder id to be permanently deleted.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Deletes permanently a folder. This action cannot be undone.

ALIASES
  $ internxt delete permanently folder

EXAMPLES
  $ internxt delete-permanently-folder
```

_See code: [src/commands/delete-permanently-folder.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/delete-permanently-folder.ts)_

## `internxt delete permanently file`

Deletes permanently a file. This action cannot be undone.

```
USAGE
  $ internxt delete permanently file [--json] [-x] [-i <value>]

FLAGS
  -i, --id=<value>  The file id to be permanently deleted.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Deletes permanently a file. This action cannot be undone.

ALIASES
  $ internxt delete permanently file

EXAMPLES
  $ internxt delete permanently file
```

## `internxt delete permanently folder`

Deletes permanently a folder. This action cannot be undone.

```
USAGE
  $ internxt delete permanently folder [--json] [-x] [-i <value>]

FLAGS
  -i, --id=<value>  The folder id to be permanently deleted.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Deletes permanently a folder. This action cannot be undone.

ALIASES
  $ internxt delete permanently folder

EXAMPLES
  $ internxt delete permanently folder
```

## `internxt download-file`

Download and decrypts a file from Internxt Drive to a directory. The file name will be the same as the file name in your Drive.

```
USAGE
  $ internxt download-file [--json] [-x] [-i <value>] [-d <value>] [-o]

FLAGS
  -d, --directory=<value>  The directory to download the file to. Leave empty for the current folder.
  -i, --id=<value>         The id of the file to download. Use internxt list to view your files ids
  -o, --overwrite          Overwrite the file if it already exists

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Download and decrypts a file from Internxt Drive to a directory. The file name will be the same as the file name in
  your Drive.

ALIASES
  $ internxt download file

EXAMPLES
  $ internxt download-file
```

_See code: [src/commands/download-file.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/download-file.ts)_

## `internxt download file`

Download and decrypts a file from Internxt Drive to a directory. The file name will be the same as the file name in your Drive.

```
USAGE
  $ internxt download file [--json] [-x] [-i <value>] [-d <value>] [-o]

FLAGS
  -d, --directory=<value>  The directory to download the file to. Leave empty for the current folder.
  -i, --id=<value>         The id of the file to download. Use internxt list to view your files ids
  -o, --overwrite          Overwrite the file if it already exists

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Download and decrypts a file from Internxt Drive to a directory. The file name will be the same as the file name in
  your Drive.

ALIASES
  $ internxt download file

EXAMPLES
  $ internxt download file
```

## `internxt list`

Lists the content of a folder id.

```
USAGE
  $ internxt list [--json] [-x] [-i <value>] [-e]

FLAGS
  -e, --extended    Displays additional information in the list.
  -i, --id=<value>  The folder id to list. Leave empty for the root folder.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Lists the content of a folder id.

EXAMPLES
  $ internxt list
```

_See code: [src/commands/list.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/list.ts)_

## `internxt login`

Logs into an Internxt account. If the account is two-factor protected, then an extra code will be required.

```
USAGE
  $ internxt login [--json] [-x] [-e <value>] [-p <value>] [-w 123456]

FLAGS
  -e, --email=<value>     The email to log in
  -p, --password=<value>  The plain password to log in
  -w, --twofactor=123456  The two factor auth code (only needed if the account is two-factor protected)

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Logs into an Internxt account. If the account is two-factor protected, then an extra code will be required.

EXAMPLES
  $ internxt login
```

_See code: [src/commands/login.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/login.ts)_

## `internxt logout`

Logs out the current internxt user that is logged into the Internxt CLI.

```
USAGE
  $ internxt logout [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Logs out the current internxt user that is logged into the Internxt CLI.

EXAMPLES
  $ internxt logout
```

_See code: [src/commands/logout.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/logout.ts)_

## `internxt logs`

Displays the Internxt CLI logs directory path

```
USAGE
  $ internxt logs [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays the Internxt CLI logs directory path

EXAMPLES
  $ internxt logs
```

_See code: [src/commands/logs.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/logs.ts)_

## `internxt move-file`

Move a file into a destination folder.

```
USAGE
  $ internxt move-file [--json] [-x] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The destination folder id where the file is going to be moved. Leave empty for the root
                             folder.
  -i, --id=<value>           The ID of the file to be moved.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Move a file into a destination folder.

ALIASES
  $ internxt move file

EXAMPLES
  $ internxt move-file
```

_See code: [src/commands/move-file.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/move-file.ts)_

## `internxt move-folder`

Move a folder into a destination folder.

```
USAGE
  $ internxt move-folder [--json] [-x] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The destination folder id where the folder is going to be moved. Leave empty for the root
                             folder.
  -i, --id=<value>           The ID of the folder to be moved.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Move a folder into a destination folder.

ALIASES
  $ internxt move folder

EXAMPLES
  $ internxt move-folder
```

_See code: [src/commands/move-folder.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/move-folder.ts)_

## `internxt move file`

Move a file into a destination folder.

```
USAGE
  $ internxt move file [--json] [-x] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The destination folder id where the file is going to be moved. Leave empty for the root
                             folder.
  -i, --id=<value>           The ID of the file to be moved.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

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
  $ internxt move folder [--json] [-x] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The destination folder id where the folder is going to be moved. Leave empty for the root
                             folder.
  -i, --id=<value>           The ID of the folder to be moved.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Move a folder into a destination folder.

ALIASES
  $ internxt move folder

EXAMPLES
  $ internxt move folder
```

## `internxt rename-file`

Rename a file.

```
USAGE
  $ internxt rename-file [--json] [-x] [-i <value>] [-n <value>]

FLAGS
  -i, --id=<value>    The ID of the file to be renamed.
  -n, --name=<value>  The new name for the file.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Rename a file.

ALIASES
  $ internxt rename file

EXAMPLES
  $ internxt rename-file
```

_See code: [src/commands/rename-file.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/rename-file.ts)_

## `internxt rename-folder`

Rename a folder.

```
USAGE
  $ internxt rename-folder [--json] [-x] [-i <value>] [-n <value>]

FLAGS
  -i, --id=<value>    The ID of the folder to be renamed.
  -n, --name=<value>  The new name for the folder.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Rename a folder.

ALIASES
  $ internxt rename folder

EXAMPLES
  $ internxt rename-folder
```

_See code: [src/commands/rename-folder.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/rename-folder.ts)_

## `internxt rename file`

Rename a file.

```
USAGE
  $ internxt rename file [--json] [-x] [-i <value>] [-n <value>]

FLAGS
  -i, --id=<value>    The ID of the file to be renamed.
  -n, --name=<value>  The new name for the file.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Rename a file.

ALIASES
  $ internxt rename file

EXAMPLES
  $ internxt rename file
```

## `internxt rename folder`

Rename a folder.

```
USAGE
  $ internxt rename folder [--json] [-x] [-i <value>] [-n <value>]

FLAGS
  -i, --id=<value>    The ID of the folder to be renamed.
  -n, --name=<value>  The new name for the folder.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Rename a folder.

ALIASES
  $ internxt rename folder

EXAMPLES
  $ internxt rename folder
```

## `internxt trash-clear`

Deletes permanently all the content of the trash. This action cannot be undone.

```
USAGE
  $ internxt trash-clear [--json] [-x] [-f]

FLAGS
  -f, --force  It forces the trash to be emptied without confirmation.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Deletes permanently all the content of the trash. This action cannot be undone.

ALIASES
  $ internxt trash clear

EXAMPLES
  $ internxt trash-clear
```

_See code: [src/commands/trash-clear.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/trash-clear.ts)_

## `internxt trash-file`

Moves a given file to the trash.

```
USAGE
  $ internxt trash-file [--json] [-x] [-i <value>]

FLAGS
  -i, --id=<value>  The file id to be trashed.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Moves a given file to the trash.

ALIASES
  $ internxt trash file

EXAMPLES
  $ internxt trash-file
```

_See code: [src/commands/trash-file.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/trash-file.ts)_

## `internxt trash-folder`

Moves a given folder to the trash.

```
USAGE
  $ internxt trash-folder [--json] [-x] [-i <value>]

FLAGS
  -i, --id=<value>  The folder id to be trashed.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Moves a given folder to the trash.

ALIASES
  $ internxt trash folder

EXAMPLES
  $ internxt trash-folder
```

_See code: [src/commands/trash-folder.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/trash-folder.ts)_

## `internxt trash-list`

Lists the content of the trash.

```
USAGE
  $ internxt trash-list [--json] [-e]

FLAGS
  -e, --extended  Displays additional information in the trash list.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Lists the content of the trash.

ALIASES
  $ internxt trash list

EXAMPLES
  $ internxt trash-list
```

_See code: [src/commands/trash-list.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/trash-list.ts)_

## `internxt trash-restore-file`

Restore a trashed file into a destination folder.

```
USAGE
  $ internxt trash-restore-file [--json] [-x] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The folder id where the file is going to be restored. Leave empty for the root folder.
  -i, --id=<value>           The file id to be restored from the trash.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Restore a trashed file into a destination folder.

ALIASES
  $ internxt trash restore file

EXAMPLES
  $ internxt trash-restore-file
```

_See code: [src/commands/trash-restore-file.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/trash-restore-file.ts)_

## `internxt trash-restore-folder`

Restore a trashed folder into a destination folder.

```
USAGE
  $ internxt trash-restore-folder [--json] [-x] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The folder id where the folder is going to be restored. Leave empty for the root folder.
  -i, --id=<value>           The folder id to be restored from the trash.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Restore a trashed folder into a destination folder.

ALIASES
  $ internxt trash restore folder

EXAMPLES
  $ internxt trash-restore-folder
```

_See code: [src/commands/trash-restore-folder.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/trash-restore-folder.ts)_

## `internxt trash clear`

Deletes permanently all the content of the trash. This action cannot be undone.

```
USAGE
  $ internxt trash clear [--json] [-x] [-f]

FLAGS
  -f, --force  It forces the trash to be emptied without confirmation.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Deletes permanently all the content of the trash. This action cannot be undone.

ALIASES
  $ internxt trash clear

EXAMPLES
  $ internxt trash clear
```

## `internxt trash file`

Moves a given file to the trash.

```
USAGE
  $ internxt trash file [--json] [-x] [-i <value>]

FLAGS
  -i, --id=<value>  The file id to be trashed.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Moves a given file to the trash.

ALIASES
  $ internxt trash file

EXAMPLES
  $ internxt trash file
```

## `internxt trash folder`

Moves a given folder to the trash.

```
USAGE
  $ internxt trash folder [--json] [-x] [-i <value>]

FLAGS
  -i, --id=<value>  The folder id to be trashed.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Moves a given folder to the trash.

ALIASES
  $ internxt trash folder

EXAMPLES
  $ internxt trash folder
```

## `internxt trash list`

Lists the content of the trash.

```
USAGE
  $ internxt trash list [--json] [-e]

FLAGS
  -e, --extended  Displays additional information in the trash list.

GLOBAL FLAGS
  --json  Format output as json.

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
  $ internxt trash restore file [--json] [-x] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The folder id where the file is going to be restored. Leave empty for the root folder.
  -i, --id=<value>           The file id to be restored from the trash.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

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
  $ internxt trash restore folder [--json] [-x] [-i <value>] [-d <value>]

FLAGS
  -d, --destination=<value>  The folder id where the folder is going to be restored. Leave empty for the root folder.
  -i, --id=<value>           The folder id to be restored from the trash.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Restore a trashed folder into a destination folder.

ALIASES
  $ internxt trash restore folder

EXAMPLES
  $ internxt trash restore folder
```

## `internxt upload-file`

Upload a file to Internxt Drive

```
USAGE
  $ internxt upload-file [--json] [-x] [-f <value>] [-i <value>]

FLAGS
  -f, --file=<value>         The path to the file on your system.
  -i, --destination=<value>  The folder id where the file is going to be uploaded to. Leave empty for the root folder.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Upload a file to Internxt Drive

ALIASES
  $ internxt upload file

EXAMPLES
  $ internxt upload-file
```

_See code: [src/commands/upload-file.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/upload-file.ts)_

## `internxt upload file`

Upload a file to Internxt Drive

```
USAGE
  $ internxt upload file [--json] [-x] [-f <value>] [-i <value>]

FLAGS
  -f, --file=<value>         The path to the file on your system.
  -i, --destination=<value>  The folder id where the file is going to be uploaded to. Leave empty for the root folder.

HELPER FLAGS
  -x, --non-interactive  Prevents the CLI from being interactive. When enabled, the CLI will not request input through
                         the console and will throw errors directly.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Upload a file to Internxt Drive

ALIASES
  $ internxt upload file

EXAMPLES
  $ internxt upload file
```

## `internxt webdav ACTION`

Enable, disable, restart or get the status of the Internxt CLI WebDav server

```
USAGE
  $ internxt webdav ACTION [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Enable, disable, restart or get the status of the Internxt CLI WebDav server

EXAMPLES
  $ internxt webdav enable

  $ internxt webdav disable

  $ internxt webdav restart

  $ internxt webdav status
```

_See code: [src/commands/webdav.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/webdav.ts)_

## `internxt webdav-config`

Edit the configuration of the Internxt CLI WebDav server as the port or the protocol.

```
USAGE
  $ internxt webdav-config [--json] [-p <value>] [-s | -h] [-t <value>]

FLAGS
  -h, --http             Configures the WebDAV server to use insecure plain HTTP.
  -p, --port=<value>     The new port for the WebDAV server.
  -s, --https            Configures the WebDAV server to use HTTPS with self-signed certificates.
  -t, --timeout=<value>  Configures the WebDAV server to use this timeout in minutes.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Edit the configuration of the Internxt CLI WebDav server as the port or the protocol.

EXAMPLES
  $ internxt webdav-config
```

_See code: [src/commands/webdav-config.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/webdav-config.ts)_

## `internxt whoami`

Display the current user logged into the Internxt CLI.

```
USAGE
  $ internxt whoami [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Display the current user logged into the Internxt CLI.

EXAMPLES
  $ internxt whoami
```

_See code: [src/commands/whoami.ts](https://github.com/internxt/cli/blob/v1.5.3/src/commands/whoami.ts)_
<!-- commandsstop -->

# Current Limitations

- We currently have a 20GB size upload limitation per file for both, CLI and WebDAV
