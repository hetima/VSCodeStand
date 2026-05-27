# Change Log

All notable changes to the "VSCodeStand" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- `stand: New Memo`: Added the ability to create a new note from the selected text (uses the Markdown H1 header as the filename if available)
- Add `vscode-stand.memoEol` setting (`LF` / `CRLF`, default `LF`). New memo files are written with this line ending, and selected text is converted accordingly

## [0.1.0] - 2026-05-27

- Add `stand: New Memo` command (and explorer context menu). Creates and opens a Markdown file with the given memo name
- Add `stand: Convert to Workspace` command. Creates a `.code-workspace` file from the current folder and opens it
- Add `vscode-stand.memoDir` setting. Absolute path is the common root, relative path is per-workspace. Aloso added `stand: Select Memo Folder` command
- Add `vscode-stand.workspaceDir` setting. Absolute path is the common root, relative path is per-workspace. Aloso added `stand: Select Workspace Folder`
