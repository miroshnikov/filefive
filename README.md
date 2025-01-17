<p align="center">
    <img src="https://github.com/miroshnikov/f5/blob/main/frontend/src/assets/logo.svg" width="64" alt="FileFive" />
</p>


# FileFive: SFTP/FTP client and dual-panel file manager for macOS and Linux
FileFive is a free open-source SFTP/FTP client and file manager with intuitive and modern dual-panel interface.

It is a Node.js package and works in the browser. 

## Installation
```shell
npm install -g f5
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
  -h, --help           display help for command
```

## Features
- Supports SSH File Transfer Protocol (SFTP) and FTP
- Cross-platform, runs on Mac OS and Linux
- Minimal and intuitive UI, mimicing the VSCode Explorer view
- Search/filter files using JavaScript Regular Expressions
- Synchronized browsing
- Connections/servers are plain files stored in a folder on your filesystem
- You can use Git or any VCS to store connections and settings
- Drag & drop support
- Open files and folders in Visual Studio Code
- Uses browser tabs to browse more than one server or transfer files simultaneously

## Feedbacks
To support its development, [star FileFive on GitHub](https://github.com/miroshnikov/f5/stargazers)!

[Feedback, suggestion, improvements](https://github.com/miroshnikov/f5/discussions) or [bugs](https://github.com/miroshnikov/f5/issues) are welcome.

## License
[GPL-3.0 License](LICENSE)
