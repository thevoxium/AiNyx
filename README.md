
# Documentation

## Table of Contents
- [Introduction](#introduction)
- [Installation Guide](#installation-guide)
  - [Prerequisites](#prerequisites)
  - [Setting Up the Environment](#setting-up-the-environment)
  - [Running the Application](#running-the-application)
- [Usage](#usage)
- [API Routes](#api-routes)
- [File Structure](#file-structure)
- [Features](#features)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Introduction
This application is a web-based code editor that supports interaction with various programming languages, offers chat functionalities powered by AI, and integrates with Git for version control.

## Installation Guide

### Prerequisites
Before running the application, ensure you have the following installed:
- Python 3.x
- Git
- Flask
- Flask-SocketIO
- OpenAI API Key

### Setting Up the Environment
1. Clone the Repository:
   ```bash
   git clone <repository_url>
   cd <repository_name>
   ```

2. Create a Virtual Environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. Install Required Python Packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Install Frontend Dependencies: Ensure you navigate to the static folder and run:
   ```bash
   npm install
   ```

5. Set Environment Variables: You will need to set the following environment variables:
   ```bash
   export OPEN_ROUTER_KEY=<your_openai_api_key>
   ```

### Running the Application
To start the application, execute the following command:
```bash
python app.py
```
Then, you can access the application in your web browser at `http://localhost:5000`.

## Usage
Once the application is running, you can:
- Select directories and files from the interface.
- Edit files in the code editor.
- Save and run your code (supports Python and C++).
- Chat with an AI assistant regarding the code you are editing.
- Use Git functionalities such as committing changes and pushing to a remote repository.

## API Routes

| Route               | Method | Description                                        |
|---------------------|--------|----------------------------------------------------|
| `/`                 | GET    | Render the main application page                   |
| `/browse_directory` | GET    | Browse the current directory                       |
| `/select_directory` | POST   | Select a directory to navigate into                |
| `/file/<path:filepath>` | GET | Get content of the specified file                  |
| `/save`             | POST   | Save the content of the currently open file        |
| `/run`              | POST   | Compile and run C++/Python code                    |
| `/chat`             | POST   | Interact with the AI chatbot                       |
| `/git_push`         | POST   | Push changes to the remote Git repository          |

For an exhaustive list of API routes and their descriptions, refer to the source code or comments in the API functions in `app.py`.

## File Structure
```
<repository_name>/
|-- app.py                      # Main application logic
|-- requirements.txt            # List of Python package dependencies
|-- static/                     # Frontend assets
|   |-- script.js               # JavaScript for frontend interaction
|-- templates/                  # Templates for rendering HTML pages
|-- .editor_session/            # Session files for managing state
|-- manifest.json               # Manifest file for PWA support
```

## Features
- **Real-time Code Editing**: Utilize a powerful code editor to write and edit your code.
- **AI Support**: Get assistance with code explanation and suggestions.
- **File Management**: Manage files and directories effortlessly, including creating, renaming, and deleting.
- **Git Integration**: Perform Git operations directly from the interface.
- **Responsive UI**: Adaptable layout for various screen sizes and devices.

## Troubleshooting

### Common Issues:
- **Flask fails to start**: Ensure all dependencies are installed and the environment variables are set.
- **C++ related issues**: Ensure you have `g++` installed and properly set up in your system PATH.
  
### Logs:
Check the console for any error messages or logs that may help debug any issues during runtime.

## Contributing
Contributions are welcome! If you'd like to contribute:
1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request with a description of your changes.

