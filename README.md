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
$ npm install -g internxt-cli
$ internxt-cli COMMAND
running command...
$ internxt-cli (--version)
internxt-cli/0.0.0 darwin-arm64 node-v20.10.0
$ internxt-cli --help [COMMAND]
USAGE
  $ internxt-cli COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`internxt-cli whoami`](#internxt-cli-whoami)

## `internxt-cli whoami`

Displays the current user logged into the Internxt CLI.

```
USAGE
  $ internxt-cli whoami

DESCRIPTION
  Displays the current user logged into the Internxt CLI.

EXAMPLES
  $ internxt-cli whoami
```

_See code: [src/commands/whoami.ts](https://github.com/internxt/cli/blob/v0.0.0/src/commands/whoami.ts)_
<!-- commandsstop -->
