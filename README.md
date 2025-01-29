<p align="center">
    <img src="https://github.com/miroshnikov/filefive/blob/main/frontend/src/assets/logo.svg" width="64" alt="FileFive" />
</p>


# FileFive: SFTP/FTP client and dual-panel file manager for macOS and Linux
FileFive is a free open-source SFTP/FTP client and file manager with intuitive and modern dual-panel interface, available on Mac, and Linux. 

It is installed as a Node.js package and uses the web browser as GUI.

FileFive has a unique set of features and may an alternative to FileZilla, Cyberduck, Transmit and ForkLift.

<p align="center">
    <img src="https://github.com/miroshnikov/filefive/blob/main/screenshot.png" alt="FileFive" />
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
- Cross-platform, runs on Mac OS, Linux and any *nix with Node.js
- Supports SSH File Transfer Protocol (SFTP) and FTP
- Minimal and intuitive UI, mimicing the VSCode Explorer view
- Search/filter files using wildcards and JavaScript Regular Expressions
- Synchronized browsing
- Connections/servers are plain files stored on your filesystem in the `~/.f5/connections` folder
- Easy to backup connections and settings in `~/.f5` folder, e.g. using Git or other VCS
- Drag & drop support
- Open files and folders in default app or Visual Studio Code
- Uses browser tabs to browse more than one server or transfer files simultaneously
- Utilizes the built-in browser password manager to store passwords for different connections

## Feedbacks
To support its development, [star FileFive on GitHub](https://github.com/miroshnikov/filefive/stargazers)!

[Feedback, suggestion, improvements](https://github.com/miroshnikov/filefive/discussions) or [bugs](https://github.com/miroshnikov/filefive/issues) are welcome.

## License
[GPL-3.0 License](LICENSE)
