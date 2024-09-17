# AiNyx Documentation
## Overview

AiNyx is a web-based editor designed for a seamless coding experience. It utilizes Flask for backend services, combined with modern frontend technologies, providing essential features such as directory browsing, real-time code editing, terminal access, and AI-powered assistance.

### Features

- **Directory Browsing**: Allows users to navigate through files and directories easily.
- **Code Editing**: Offers an advanced code editing experience using the Monaco Editor with syntax highlighting and autocomplete functionality.
- **Terminal Emulation**: Real-time terminal access using xterm.js and Socket.IO.
- **AI Integration**: Features an AI-powered chatbot to assist with coding questions and provide suggestions.
- **Git Integration**: Capability to view commits and diffs from Git repositories.
- **Hardware Monitoring**: Keeps track of hardware stats like CPU, memory, and disk usage.

## Architecture

### Backend

The backend is developed using Flask, providing the following services:

- **Frontend File Serving**: Handles serving HTML, CSS, and JavaScript files.
- **API Handling**: Manages API requests for various functionalities, including directory browsing, file operations, and terminal management.
- **Real-time Communication**: Implements WebSocket connections for real-time terminal emulation and AI interaction.
- **OpenAI Communication**: Integrates with OpenAI API for AI chatbot functionalities.
- **Process Management**: Manages subprocesses for code execution, including compiling and running programs.
- **Session Management**: Maintains user sessions using Flask session management.
- **Hardware Stats Retrieval**: Uses the psutil library to monitor hardware statistics.

### Frontend

The frontend is structured using HTML, CSS, and JavaScript, featuring several libraries:

- **Monaco Editor**: For enriched code editing capabilities.
- **xterm.js**: To emulate terminal functionality.
- **Socket.IO**: For real-time bidirectional communication between the client and server.
- **Highlight.js**: For syntax highlighting in code blocks.
- **Marked.js**: To render Markdown responses from the AI chatbot.
- **GitGraph**: For visual representation of Git commits.

## Usage

### Directory Browsing

- Click the "Change Directory" button.
- Select a directory and view its contents in the sidebar.
- Click on a file to open it for editing.
- Double-click on directories to navigate deeper.

### Code Editing

- Monaco Editor provides features such as syntax highlighting, autocomplete, and line numbers.
- Open multiple files as tabs.
- Use the "Save" button or Ctrl+S / Cmd+S to save changes.
- Supports C++ and can be configured for various other languages.

### Terminal Emulation

- Toggle the terminal view using the "Terminal" button.
- Execute commands and see output in real-time.
- Supports command history and text input.

### AI-Powered Chatbot

- Access the chatbot through the "Assistant" button.
- Ask programming-related questions or request code assistance.
- AI responses are rendered in Markdown.

### Git Integration

- View the commit history and diffs of the selected Git repository.
- Use the "Git Diff" button to access commit changes.

### Hardware Statistics Monitoring

- Real-time updates on CPU, memory, and disk usage displayed on the footer.

## API Endpoints

### Directory Browsing & Management

- `GET /browse_directory`: Opens a directory selector and retrieves contents.
- `POST /select_directory`: Selects a directory and returns its contents.
- `GET /files`: Lists files in the selected directory.
- `GET /file/<filename>`: Retrieves the contents of a specific file.
- `POST /save`: Saves the currently edited file's contents.
- `GET /get_directory_structure`: Retrieves current directory structure.

### Code Execution

- `POST /run`: Compiles and executes the current code file.

### AI Chatbot Integration

- `POST /chat`: Sends a message to the AI and retrieves a response.

### Terminal Management

- `WEB_SOCKET /terminal`: Initializes a WebSocket connection for terminal commands.

### Git Integration

- `GET /get_commits`: Retrieves the commit history.
- `POST /git_diff`: Retrieves the diff for a specific commit.

### Hardware Statistics

- `GET /hardware_stats`: Provides real-time CPU, memory, and disk statistics.

## Frontend Integration

### Templates

- **index.html**: The main entry point of the application, containing all necessary scripts and styles, implements the interface layout and features.

### Static Scripts

- **script.js**: Houses all the client-side logic, handling file operations, API requests, terminal commands, and chat functionalities.

### Structure

- **HTML Elements**: Organized into sections:
  - Sidebar for directory browsing.
  - Editor for code input.
  - Terminal for command execution.
  - Chat area for AI interaction.

## Conclusion

AiNyx provides a full-featured coding environment with numerous integrations that cater to modern development needs. This comprehensive documentation outlines the essential features and functionalities to help users navigate and utilize the editor effectively. For any further inquiries or issues, please refer to the support section or GitHub repository linked within the application.
