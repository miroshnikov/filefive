<p align="center">
    <img src="https://github.com/miroshnikov/filefive/blob/main/frontend/src/assets/logo.svg" width="64" alt="FileFive" />
</p>


# FileFive: SFTP/FTP client and dual-panel file manager for macOS and Linux
FileFive is a free open-source SFTP/FTP/Amazon S3 client and file manager with intuitive and modern dual-panel interface, available on Mac, and Linux. 

It is installed as a Node.js package and uses the web browser as GUI.

FileFive has a unique set of features and may be a free alternative to FileZilla Pro, Transmit, ForkLift and Cyberduck.

<p align="center">
    <img src="https://github.com/miroshnikov/filefive/blob/main/docs/screenshots/screenshot-1.png" alt="FileFive" />
</p>
<p align="center">
  <details>
    <summary>More screenshots</summary>
    <img src="https://github.com/miroshnikov/filefive/blob/main/docs/screenshots/screenshot-2.png" alt="FileFive"/>
    <img src="https://github.com/miroshnikov/filefive/blob/main/docs/screenshots/screenshot-3.png" alt="FileFive"/>
    <img src="https://github.com/miroshnikov/filefive/blob/main/docs/screenshots/screenshot-4.png" alt="FileFive"/>
  </details>
</p>

## Installation
```shell
npm install -g filefive
```

## Usage
Run `f5` and FileFive will be opened in the default browser. Press <kbd>ctrl</kbd> + <kbd>c</kbd> to quit the program.
```
> f5 --help
Usage: F5 [options]

SFTP/FTP client, dual-panel file manager in the browser

Options:
  -V, --version        output the version number
  -p, --port <number>  port number (default: "3113")
  --log                prints the log information
  -h, --help           display help
```

## Features
- Cross-platform, runs on MacOS, Linux and any *nix with Node.js
- Supports 
  - SSH File Transfer Protocol (SFTP)
  - File Transfer Protocol (FTP)
  - Amazon Simple Storage Service (Amazon S3)
- Minimalistic and intuitive UI, mimicing the look and feel of VSCode Explorer view
- Search/filter files using wildcards and JavaScript Regular Expressions
- Synchronized browsing
- Copy files keeping relative paths, allows synchronization files in nested folders in one click
- Remote file editing
- Files' Git statuses (uses your machine's Git installation)
- Connections/servers are plain files stored on your filesystem, no need to export/import
- Easy to copy and backup connections and settings in `~/.f5` folder, e.g. by putting them into a Git repo
- Drag & drop, copy & paste files support
- Use browser tabs to browse more than one server or transfer files simultaneously
- Utilize the built-in browser password manager to store passwords
- Open files and folders in default app or Visual Studio Code
- Theming: System preference, Light, Dark; a different color theme per connection
- Search On Type

## Feedbacks
To support its development, [star FileFive on GitHub](https://github.com/miroshnikov/filefive/stargazers)!

[Feedback, suggestion, improvements](https://github.com/miroshnikov/filefive/discussions) or [bugs](https://github.com/miroshnikov/filefive/issues) are welcome.

## License
[GPL-3.0 License](LICENSE)
