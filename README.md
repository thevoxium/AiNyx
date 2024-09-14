# CodeNode Documentation

## Overview

CodeNode is a web-based integrated development environment (IDE) that provides a convenient and efficient way to browse directories, edit code, and interact with a terminal. It is built using Flask for the backend and HTML, CSS, and JavaScript for the frontend.

## Features

- Directory browsing and file management
- Code editing with syntax highlighting and autocomplete using Monaco Editor
- Terminal emulation using xterm.js and Socket.IO
- Real-time collaboration and assistance using an AI-powered chatbot
- Git integration for viewing commits and diffs
- Hardware statistics monitoring

## Architecture

### Backend

The backend is implemented using Flask, a Python web framework. It handles the following functionalities:

- Serving the frontend files
- Handling API requests for directory browsing, file management, and code execution
- Managing the terminal sessions using pseudoterminals (PTYs)
- Communicating with the OpenAI API for the AI-powered chatbot
- Retrieving hardware statistics using psutil
- Interacting with Git repositories

### Frontend

The frontend is built using HTML, CSS, and JavaScript. It utilizes the following libraries and frameworks:

- Monaco Editor for code editing
- xterm.js for terminal emulation
- Socket.IO for real-time communication between the frontend and backend
- Highlight.js for syntax highlighting in code blocks
- Marked for rendering Markdown responses from the AI chatbot
- GitGraph for visualizing Git commit history

## Usage

### Directory Browsing

- Click on the "Browse Directory" button to select a directory.
- The selected directory's contents will be displayed in the sidebar.
- Click on a file to open it in the code editor.
- Double-click on a directory to navigate into it.

### Code Editing

- The code editor uses Monaco Editor, which provides syntax highlighting, autocomplete, and other advanced editing features.
- Multiple files can be opened in separate tabs.
- Files can be saved using the "Save" button or by pressing `Ctrl+S` (or `Cmd+S` on macOS).
- The editor supports C++ syntax highlighting and can be extended to support other languages.

### Terminal Emulation

- The terminal can be toggled using the "Terminal" button.
- It uses xterm.js for terminal emulation and Socket.IO for real-time communication with the backend.
- Commands can be entered and executed in the terminal, and the output will be displayed in real-time.

### AI-Powered Chatbot

- The chatbot can be toggled using the "Assistant" button.
- Users can ask questions or provide instructions related to the code or tagged files.
- The chatbot uses the OpenAI API to generate responses based on the conversation history and the current file contents.
- Responses are rendered in Markdown format, supporting code blocks, links, and other formatting options.

### Git Integration

- The Git integration allows users to view the commit history and diffs of the selected directory.
- Clicking on the "Git Diff" button opens a panel displaying the commit history and the diff of the currently selected commit.
- Users can switch between commits to view their respective diffs.

### Hardware Statistics Monitoring

- The hardware statistics (CPU usage, memory usage, and disk usage) are displayed in the footer.
- The statistics are updated in real-time using `psutil` and AJAX requests to the backend.

## API Endpoints

### Directory Browsing and File Management

- `GET /browse_directory`: Open a directory selector dialog and retrieve the selected directory's contents.
- `POST /select_directory`: Select a directory and retrieve its contents.
- `GET /files`: Retrieve the list of files in the currently selected directory.
- `GET /file/<filename>`: Retrieve the contents of a specific file.
- `POST /save`: Save the contents of the currently open file.

### Code Execution

- `POST /run`: Compile and run the currently open C++ file.

### AI Chatbot

- `POST /chat`: Send a message to the AI chatbot and receive a response.

### Terminal

- WebSocket endpoint `/terminal`: Establish a WebSocket connection for the terminal.

### Git Integration

- `GET /get_commits`: Retrieve the commit history of the currently selected directory.
- `POST /git_diff`: Retrieve the diff of a specific commit.

### Hardware Statistics

- `GET /hardware_stats`: Retrieve the current hardware statistics (CPU usage, memory usage, and disk usage).
