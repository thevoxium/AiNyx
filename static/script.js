let editor;
let openFiles = {};
let currentFile = '';
let currentPath = '/';
let expandedFolders = new Set();

const catppuccinMonacoTheme = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: '', foreground: 'cdd6f4', background: '1e1e2e' },
        { token: 'keyword', foreground: 'cba6f7' },
        { token: 'operator', foreground: '89dceb' },
        { token: 'variable', foreground: 'f5e0dc' },
        { token: 'function', foreground: '89b4fa' },
        { token: 'comment', foreground: '6c7086' },
        { token: 'number', foreground: 'fab387' },
        { token: 'string', foreground: 'a6e3a1' },
        { token: 'type', foreground: 'f9e2af' },
        // HTML-specific
        { token: 'tag', foreground: '89b4fa' },
        { token: 'attribute.name', foreground: 'f9e2af' },
        { token: 'attribute.value', foreground: 'a6e3a1' },
        // CSS-specific
        { token: 'selector', foreground: 'f5c2e7' },
        { token: 'property', foreground: '89dceb' },
        // Add more language-specific rules as needed
    ],
    colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#cdd6f4',
        'editorLineNumber.foreground': '#6c7086',
        'editorCursor.foreground': '#f5e0dc',
        'editor.selectionBackground': '#45475a',
        'editor.inactiveSelectionBackground': '#313244',
        'editorIndentGuide.background': '#313244',
        'editorIndentGuide.activeBackground': '#45475a',
    }
};

function getLanguageFromFilename(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    const languageMap = {
        'js': 'javascript',
        'py': 'python',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'md': 'markdown',
        'cpp': 'cpp',
        'c': 'c',
        'h': 'cpp',
        'hpp': 'cpp',
        'txt': 'plaintext'
        // Add more mappings as needed
    };
    return languageMap[extension] || 'plaintext';
}




function loadLanguageSupport(language) {
    return new Promise((resolve) => {
        switch (language) {
            case 'javascript':
            case 'typescript':
                require(['vs/language/typescript/tsMode'], function (tsMode) {
                    tsMode.setupTypeScript(monaco);
                    tsMode.setupJavaScript(monaco);
                    resolve();
                });
                break;
            case 'css':
                require(['vs/language/css/cssMode'], function (cssMode) {
                    cssMode.setupCSS(monaco);
                    resolve();
                });
                break;
            case 'html':
                require(['vs/language/html/htmlMode'], function (htmlMode) {
                    htmlMode.setupHTML(monaco);
                    resolve();
                });
                break;
            case 'json':
                require(['vs/language/json/jsonMode'], function (jsonMode) {
                    jsonMode.setupJSON(monaco);
                    resolve();
                });
                break;
            case 'python':
                require(['vs/basic-languages/python/python'], function (pyMode) {
                    monaco.languages.setMonarchTokensProvider('python', pyMode.language);
                    monaco.languages.setLanguageConfiguration('python', pyMode.conf);
                    resolve();
                });
                break;
            case 'cpp':
            case 'c':
                require(['vs/basic-languages/cpp/cpp'], function (cppMode) {
                    monaco.languages.setMonarchTokensProvider('cpp', cppMode.language);
                    monaco.languages.setLanguageConfiguration('cpp', cppMode.conf);
                    resolve();
                });
                break;
            case 'java':
                require(['vs/basic-languages/java/java'], function (javaMode) {
                    monaco.languages.setMonarchTokensProvider('java', javaMode.language);
                    monaco.languages.setLanguageConfiguration('java', javaMode.conf);
                    resolve();
                });
                break;
            case 'markdown':
                require(['vs/basic-languages/markdown/markdown'], function (mdMode) {
                    monaco.languages.setMonarchTokensProvider('markdown', mdMode.language);
                    monaco.languages.setLanguageConfiguration('markdown', mdMode.conf);
                    resolve();
                });
                break;
            case 'yaml':
                require(['vs/basic-languages/yaml/yaml'], function (yamlMode) {
                    monaco.languages.setMonarchTokensProvider('yaml', yamlMode.language);
                    monaco.languages.setLanguageConfiguration('yaml', yamlMode.conf);
                    resolve();
                });
                break;
            case 'sql':
                require(['vs/basic-languages/sql/sql'], function (sqlMode) {
                    monaco.languages.setMonarchTokensProvider('sql', sqlMode.language);
                    monaco.languages.setLanguageConfiguration('sql', sqlMode.conf);
                    resolve();
                });
                break;
            case 'powershell':
                require(['vs/basic-languages/powershell/powershell'], function (psMode) {
                    monaco.languages.setMonarchTokensProvider('powershell', psMode.language);
                    monaco.languages.setLanguageConfiguration('powershell', psMode.conf);
                    resolve();
                });
                break;
            case 'csharp':
                require(['vs/basic-languages/csharp/csharp'], function (csMode) {
                    monaco.languages.setMonarchTokensProvider('csharp', csMode.language);
                    monaco.languages.setLanguageConfiguration('csharp', csMode.conf);
                    resolve();
                });
                break;
            default:
                console.warn(`Language support for ${language} is not explicitly defined.`);
                resolve();
        }
    });
}




require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.30.1/min/vs' } });
require(['vs/editor/editor.main'], function() {


    monaco.editor.defineTheme('catppuccin-mocha', catppuccinMonacoTheme);
    editor = monaco.editor.create(document.getElementById('editor'), {
        value: '// Select a file to edit',
        language: 'plaintext', 
        theme: 'catppuccin-mocha',
        automaticLayout: true,
        lineNumbers: 'on',
        glyphMargin: false,
        folding: false,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        padding: {
            top: 15
        }
    });

    // Adjust editor layout after initialization
    setTimeout(() => {
        editor.layout();
    }, 100);

    // Add resize listener to ensure proper layout on window resize
    window.addEventListener('resize', () => {
        editor.layout();
    });

    browseDirectory('/');
    initializeResizers();
});

function updateEditorLayout() {
    if (editor) {
        const editorElement = document.getElementById('editor');
        const rect = editorElement.getBoundingClientRect();
        editor.layout({
            width: rect.width,
            height: rect.height
        });
    }
}



let isOpen = false;
function toggleIO() {
    isOpen = !isOpen;
    document.getElementById('io-container').style.display = isOpen ? 'flex' : 'none';
    // Add your logic here to actually open/close the I/O container
}

function updateDirectoryBrowser(data) {
    const directoryList = document.getElementById('directory-list');
    const currentPathElement = document.getElementById('current-path');
    
    currentPathElement.textContent = data.current_path;
    directoryList.innerHTML = '';
    console.log('UdfdfdffdffdfdfdfDB');
    console.log(data.current_path)
    if (data.current_path !== '/') {
        const parentDir = document.createElement('div');
        parentDir.textContent = '..';
        parentDir.onclick = () => browseDirectory(data.current_path + '/..');
        directoryList.appendChild(parentDir);
    }

    data.directories.forEach(dir => {
        const dirElement = document.createElement('div');
        dirElement.textContent = dir;
        dirElement.onclick = () => browseDirectory(data.current_path + '/' + dir);
        directoryList.appendChild(dirElement);
    });

    data.files.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.textContent = file;
        fileElement.onclick = () => loadFile(data.current_path+'/'+file);
        directoryList.appendChild(fileElement);
    });
}

function selectDirectory(directory) {
    fetch('/select_directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: directory }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification('Directory selected: ' + data.directory, 'success');
            loadFileList();
        } else {
            showNotification('Error selecting directory: ' + data.message, 'error');
        }
    });
}





function loadFileList() {
    fetch('/files')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const fileList = document.getElementById('file-list');
                fileList.innerHTML = '<h2>Files</h2>';
                data.files.forEach(file => {
                    const fileElement = document.createElement('div');
                    fileElement.textContent = file;
                    fileElement.onclick = () => loadFile(file);
                    fileList.appendChild(fileElement);
                });
            } else {
                showNotification('Error loading files: ' + data.message, 'error');
            }
        });
}








function saveCurrentFile() {
    if (!currentFile) {
        showNotification('No file selected', 'error');
        return;
    }
    const content = editor.getValue();
    fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: currentFile, content: content }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification('File saved successfully', 'success');
            updateGitInfo(); 
        } else {
            showNotification('Error saving file: ' + data.message, 'error');
        }
    });
}

function runCode() {
    if (!currentFile || (!currentFile.endsWith('.cpp') && !currentFile.endsWith('.py'))) {
        showNotification('Please select a C++ or Python file to run', 'error');
        return;
    }
    
    // Save the file before running
    saveCurrentFile();
    
    const outputElement = document.getElementById('output-area');
    outputElement.textContent = 'Running...';
    
    const input = document.getElementById('input-area').value;
    
    fetch('/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: currentFile, input: input }),
    })
    .then(response => response.json())
    .then(data => {
        let outputContent = data.output || 'No output';
        if (data.status === 'error') {
            outputContent = 'Error: ' + outputContent;
        }
        outputElement.textContent = outputContent;
    })
    .catch(error => {
        outputElement.textContent = 'Error: ' + error.message;
    });
}

function showNotification(message, type) {
    const notification = document.getElementById('save-notification');
    notification.textContent = message;
    notification.className = type;
    notification.style.display = 'inline';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function initializeResizers() {
    const sidebar = document.getElementById('sidebar');
    const editorContainer = document.getElementById('editor-container');
    const ioContainer = document.getElementById('io-container');
    const chatContainer = document.getElementById('chat-container');
    const terminalContainer = document.getElementById('terminal-container');
    const resizer1 = document.getElementById('resizer-1');
    const resizer2 = document.getElementById('resizer-2');
    const resizer3 = document.getElementById('resizer-3');
    const resizer4 = document.getElementById('resizer-4');

    const minWidth = 100; // Minimum width for any container

    let isResizing = false;
    let currentResizer;

    function startResize(e, resizer) {
        isResizing = true;
        currentResizer = resizer;
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
    }

    function resize(e) {
        if (!isResizing) return;

        const containerWidth = window.innerWidth;

        if (currentResizer === resizer1) {
            const newSidebarWidth = Math.max(minWidth, e.clientX);
            sidebar.style.width = `${newSidebarWidth}px`;
            editorContainer.style.width = `${containerWidth - newSidebarWidth - ioContainer.offsetWidth - chatContainer.offsetWidth - terminalContainer.offsetWidth}px`;
        } else if (currentResizer === resizer2) {
            const newIoContainerWidth = Math.max(minWidth, containerWidth - e.clientX - chatContainer.offsetWidth - terminalContainer.offsetWidth);
            ioContainer.style.width = `${newIoContainerWidth}px`;
            editorContainer.style.width = `${containerWidth - sidebar.offsetWidth - newIoContainerWidth - chatContainer.offsetWidth - terminalContainer.offsetWidth}px`;
        } else if (currentResizer === resizer3) {
            const newChatContainerWidth = Math.max(minWidth, containerWidth - e.clientX - terminalContainer.offsetWidth);
            chatContainer.style.width = `${newChatContainerWidth}px`;
            editorContainer.style.width = `${containerWidth - sidebar.offsetWidth - ioContainer.offsetWidth - newChatContainerWidth - terminalContainer.offsetWidth}px`;
        } else if (currentResizer === resizer4) {
            const newTerminalContainerWidth = Math.max(minWidth, containerWidth - e.clientX);
            terminalContainer.style.width = `${newTerminalContainerWidth}px`;
            editorContainer.style.width = `${containerWidth - sidebar.offsetWidth - ioContainer.offsetWidth - chatContainer.offsetWidth - newTerminalContainerWidth}px`;
        }

        // Ensure the Monaco editor resizes properly
        if (editor) {
            editor.layout();
        }

        // Resize the terminal if it exists
        if (terminal) {
            terminal.fit();
        }
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
    }

    resizer1.addEventListener('mousedown', (e) => startResize(e, resizer1));
    resizer2.addEventListener('mousedown', (e) => startResize(e, resizer2));
    resizer3.addEventListener('mousedown', (e) => startResize(e, resizer3));
    resizer4.addEventListener('mousedown', (e) => startResize(e, resizer4));
}

function toggleChat() {
    const chatContainer = document.getElementById('chat-container');
    const editorContainer = document.getElementById('editor-container');
    const ioContainer = document.getElementById('io-container');
    const chatInputArea = document.getElementById('chat-input-area');
    
    if (chatContainer.style.display === 'none' || chatContainer.style.display === '') {
        chatContainer.style.display = 'flex';
        editorContainer.style.width = 'calc(100% - 500px)';  // Adjust width for chat
        ioContainer.style.width = '250px';  // Reduce IO container width
        
        // Add event listener when chat is opened
        if (chatInputArea) {
            chatInputArea.addEventListener('keypress', handleChatInputKeypress);
        }
    } else {
        chatContainer.style.display = 'none';
        editorContainer.style.width = 'calc(100% - 250px)';  // Restore original width
        ioContainer.style.width = '250px';  // Restore original IO container width
        
        // Remove event listener when chat is closed
        if (chatInputArea) {
            chatInputArea.removeEventListener('keypress', handleChatInputKeypress);
        }
    }
    
    if (editor) {
        editor.layout();
    }
}
document.addEventListener('keydown', function(event){
  if(event.ctrlKey && event.key == 'k'){
    const sidebarContainer = document.getElementById("sidebar");
    if (sidebarContainer.style.display === "none"){
      sidebarContainer.style.display = "flex";
    }else{
      sidebarContainer.style.display = "none";
    }
  }
});

document.addEventListener('keydown', function(event){
  if(event.ctrlKey && event.key == 'a'){
    toggleChat();
  }
});


document.addEventListener('keydown', function(event){
  if(event.ctrlKey && event.key == 's'){
    saveCurrentFile();
  }
});

function handleChatInputKeypress(e) {
    console.log("hello");
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function sendMessage() {
    const chatInputArea = document.getElementById('chat-input-area');
    const message = chatInputArea.innerText.trim();
    if (message) {
        addMessageToChat('user', message);
        chatInputArea.innerText = '';

        const currentCode = editor.getValue();
        const taggedFiles = parseTaggedFiles(message);

        fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                code: currentCode, 
                message: message,
                taggedFiles: taggedFiles
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                addMessageToChat('ai', data.response);
            } else {
                addMessageToChat('ai', 'Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            addMessageToChat('ai', 'An error occurred while processing your request.');
        });
    }
}

function parseTaggedFiles(message) {
    const regex = /@([\w./]+(?:\.\w+)?)/g;
    const matches = message.match(regex);
    return matches ? matches.map(match => match.slice(1)) : [];
}

function highlightTaggedFiles(message) {
    const regex = /@([\w./]+(?:\.\w+)?)/g;
    return message.replace(regex, '<span class="tagged-file">$&</span>');
}
function addMessageToChat(sender, content) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', sender + '-message');
    
    if (sender === 'user') {
        // Highlight tagged files in user messages
        content = highlightTaggedFiles(content);
        messageElement.innerHTML = content;
    } else if (sender === 'ai') {
        messageElement.innerHTML = marked.parse(content);
        
        // Apply syntax highlighting to code blocks
        messageElement.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}







function updateHardwareStats() {
    fetch('/hardware_stats')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Received hardware stats:", data);
            
            const cpuElement = document.querySelector('#cpu-usage span');
            const memoryElement = document.querySelector('#memory-usage span');
            const diskElement = document.querySelector('#disk-usage span');
            
            if (cpuElement && memoryElement && diskElement) {
                cpuElement.textContent = `${data.cpu_usage}%`;
                memoryElement.textContent = `${data.memory_used}/${data.memory_total}GB`;
                diskElement.textContent = `${data.disk_used}/${data.disk_total}GB`;
                console.log("Updated DOM with new stats");
            } else {
                console.error("One or more DOM elements not found");
            }
        })
        .catch(error => {
            console.error('Error fetching hardware stats:', error);
        });
}

// Update hardware stats every 5 seconds
const statsInterval = setInterval(updateHardwareStats, 5000);

// Call updateHardwareStats immediately to populate initial values
updateHardwareStats();

// Add this function to stop updating stats when the page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(statsInterval);
    } else {
        updateHardwareStats();
        setInterval(updateHardwareStats, 5000);
    }
});


let terminal;
let socket;
let currentLine = '';
const PROMPT = '$ ';

document.addEventListener('DOMContentLoaded', function() {
    initializeTerminal();
});


function initializeTerminal() {
    terminal = new Terminal({
        cursorBlink: true,
        scrollback: 1000,
        cols: 80,
        rows: 24
    });
    terminal.open(document.getElementById('terminal'));
    
    // Initialize Socket.IO
    socket = io('/terminal');

    socket.on('connect', function() {
        console.log('Socket connected');
        terminal.write('\r\n*** Connected to terminal ***\r\n');
        writePrompt();
    });

    socket.on('output', function(data) {
        console.log('Received output:', data);
        terminal.write(data);
        writePrompt();
    });

    socket.on('disconnect', function() {
        console.log('Socket disconnected');
        terminal.write('\r\n*** Disconnected from terminal ***\r\n');
    });

    terminal.onKey(function(ev) {
        const printable = !ev.domEvent.altKey && !ev.domEvent.ctrlKey && !ev.domEvent.metaKey;

        if (ev.domEvent.keyCode === 13) { // Enter key
            terminal.write('\r\n');
            if (currentLine.trim().length > 0) {
                sendCommand(currentLine);
                currentLine = '';
            } else {
                writePrompt();
            }
        } else if (ev.domEvent.keyCode === 8) { // Backspace
            if (currentLine.length > 0) {
                currentLine = currentLine.slice(0, -1);
                terminal.write('\b \b');
            }
        } else if (printable) {
            currentLine += ev.key;
            terminal.write(ev.key);
        }
    });

    terminal.focus();
}

function writePrompt() {
    terminal.write('\r\n' + PROMPT);
    currentLine = '';
}

function sendCommand(command) {
    console.log('Sending command:', command);
    socket.emit('command', command);
}

function toggleTerminal() {
    const terminalContainer = document.getElementById('terminal-container');
    const ioContainer = document.getElementById('io-container');
    if (terminalContainer.style.display === 'none') {
        terminalContainer.style.display = 'flex';
        terminal.focus();
        ioContainer.style.display = 'none';
    } else {
        terminalContainer.style.display = 'none';
    }
}




function browseDirectory() {
    fetch('/browse_directory')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                console.log("Updated directory received");
                console.log(data.current_path);
                console.log(data.directories);
                fetchDirectoryStructure();
                updateDirectoryBrowser(data);
                updateGitInfo();
            } else {
                showNotification('Error browsing directory: ' + data.message, 'error');
            }
        });
}






function getGitDiff() {
    fetch('/get_commits')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                populateCommitDropdown(data.commits);
                showGitDiffPanel();
                fetchDiff('HEAD');
            } else {
                showNotification('Error getting commits: ' + data.message, 'error');
            }
        })
        .catch(error => {
            showNotification('Error: ' + error.message, 'error');
        });
}

function populateCommitDropdown(commits) {
    const select = document.getElementById('commit-select');
    select.innerHTML = '<option value="HEAD">Current changes</option>';
    commits.forEach(commit => {
        const option = document.createElement('option');
        option.value = commit.hash;
        option.textContent = `${commit.hash.substring(0, 7)} - ${commit.message}`;
        select.appendChild(option);
    });
    select.onchange = function() {
        fetchDiff(this.value);
    };
}

function fetchDiff(commitHash) {
    fetch('/git_diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commit_hash: commitHash }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            document.getElementById('git-diff-content').innerHTML = data.diff;
        } else {
            showNotification('Error getting git diff: ' + data.message, 'error');
        }
    })
    .catch(error => {
        showNotification('Error: ' + error.message, 'error');
    });
}


function showGitDiffPanel() {
    document.getElementById('app').style.display = 'none';

    // Show git diff container
    document.getElementById('git-diff-container').style.display = 'flex';

    // Prevent scrolling on the body
    document.body.style.overflow = 'hidden';
}



function closeGitDiff() {
    // Hide git diff container
    document.getElementById('git-diff-container').style.display = 'none';

    // Show the app container
    document.getElementById('app').style.display = 'flex';

    // Restore scrolling on the body
    document.body.style.overflow = 'auto';
}






function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
        case 'js':
        case 'py':
        case 'cpp':
        case 'java':
        case 'c':
            return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
        case 'html':
            return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>';
        case 'txt':
            return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>';
        default:
            return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
    }
}




function loadFile(fullPath) {
    console.log('Loading file:', fullPath);
    fetch(`/file/${encodeURIComponent(fullPath)}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                openFileTab(fullPath, data.content);
            } else {
                showNotification('Error loading file: ' + data.message, 'error');
            }
        })
        .catch(error => {
            showNotification('Error: ' + error.message, 'error');
        });
}









let commandPalette = null;
let commandInput = null;
let commandList = null;

document.addEventListener('DOMContentLoaded', () => {
    commandPalette = document.getElementById('command-palette');
    commandInput = document.getElementById('command-input');
    commandList = document.getElementById('command-list');

    // Show command palette on Ctrl+P
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            showCommandPalette();
        }
    });

    // Hide command palette when clicking outside
    document.addEventListener('click', (e) => {
        if (commandPalette && !commandPalette.contains(e.target)) {
            hideCommandPalette();
        }
    });

    // Prevent hiding when clicking inside the command palette
    commandPalette.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Handle input changes
    commandInput.addEventListener('input', handleCommandInput);

    // Handle form submission
    commandInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            executeCommand(commandInput.value);
        }
    });
});

function showCommandPalette() {
    commandPalette.classList.remove('hidden');
    commandInput.focus();
    
    // Get the current selection from Monaco editor
    const selection = editor.getSelection();
    const selectedText = editor.getModel().getValueInRange(selection);
    
    // Store the selection for later use
    commandPalette.dataset.selectionStartLineNumber = selection.startLineNumber;
    commandPalette.dataset.selectionStartColumn = selection.startColumn;
    commandPalette.dataset.selectionEndLineNumber = selection.endLineNumber;
    commandPalette.dataset.selectionEndColumn = selection.endColumn;
    commandPalette.dataset.selectedText = selectedText;
}




function hideCommandPalette() {
    commandPalette.classList.add('hidden');
    commandInput.value = '';
}

function handleCommandInput(e) {
    const input = e.target.value.toLowerCase();
    if (input.startsWith('add:')) {
        commandList.innerHTML = '<li>Create a new file</li>';
    } else if (input.startsWith('d:')) {
        commandList.innerHTML = '<li>Delete a file</li>';
    } else if (input.startsWith('r:')) {
        commandList.innerHTML = '<li>Rename a file</li>';
    } else if (input.startsWith('addf:')) {
        commandList.innerHTML = '<li>Create a new folder</li>';
    } else if (input.startsWith('df:')) {
        commandList.innerHTML = '<li>Delete a folder</li>';
    } else if (input.startsWith('rf:')) {
        commandList.innerHTML = '<li>Rename a folder</li>';
    } else if (input.startsWith('prompt:')){
        commandList.innerHTML = '<li>Get AI suggestion for selected code</li>';
    } else if (input.startsWith('explain:')){
        commandList.innerHTML = '<li>Get AI explaination for selected code</li>';
    } else if (input.startsWith('refactor:')){
        commandList.innerHTML = '<li>Get AI powered refactoring</li>';
    }else {
        commandList.innerHTML = '';
    }
}

function executeCommand(command) {
    if (command.toLowerCase().startsWith('add:')) {
        const filePath = command.slice(4).trim();
        addNewFile(filePath);
    } else if (command.toLowerCase().startsWith('d:')) {
        const filePath = command.slice(2).trim();
        deleteFile(filePath);
    } else if (command.toLowerCase().startsWith('r:')) {
        const paths = command.slice(2).split('->').map(p => p.trim());
        if (paths.length === 2) {
            renameFile(paths[0], paths[1]);
        } else {
            showNotification('Invalid rename command format. Use "r: old_path -> new_path"', 'error');
        }
    } else if (command.toLowerCase().startsWith('addf:')) {
        const folderPath = command.slice(5).trim();
        addNewFolder(folderPath);
    } else if (command.toLowerCase().startsWith('df:')) {
        const folderPath = command.slice(3).trim();
        deleteFolder(folderPath);
    } else if (command.toLowerCase().startsWith('rf:')) {
        const paths = command.slice(3).split('->').map(p => p.trim());
        if (paths.length === 2) {
            renameFolder(paths[0], paths[1]);
        } else {
            showNotification('Invalid rename folder command format. Use "rf: old_path -> new_path"', 'error');
        }
    } else if (command.toLowerCase().startsWith('prompt:')) {
        const prompt = command.slice(7).trim();
        const selectedText = commandPalette.dataset.selectedText;
        getAiSuggestion(prompt, selectedText);
    }else if(command.toLowerCase().startsWith('explain:')){
        const ex = command.slice(8).trim();
        const selectedText = commandPalette.dataset.selectedText;
        getAIExplaination(ex, selectedText);
    }else if(command.toLowerCase().startsWith('refactor:')){
        const ex = command.slice(9).trim();
        const selectedText = commandPalette.dataset.selectedText;
        getAiRefactoring(selectedText);
    }
    hideCommandPalette();
}



function addNewFolder(folderPath) {
    fetch('/add_folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_path: folderPath })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification('Folder created successfully: ' + folderPath, 'success');
            fetchDirectoryStructure();  // Refresh the file tree
        } else {
            showNotification('Error creating folder: ' + data.message, 'error');
        }
    })
    .catch(error => {
        showNotification('Error: ' + error.message, 'error');
    });
}

function deleteFolder(folderPath) {
    if (confirm(`Are you sure you want to delete the folder "${folderPath}" and all its contents?`)) {
        fetch('/delete_folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_path: folderPath })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showNotification('Folder deleted successfully: ' + folderPath, 'success');
                fetchDirectoryStructure();  // Refresh the file tree
            } else {
                showNotification('Error deleting folder: ' + data.message, 'error');
            }
        })
        .catch(error => {
            showNotification('Error: ' + error.message, 'error');
        });
    }
}

function renameFolder(oldPath, newPath) {
    fetch('/rename_folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_path: oldPath, new_path: newPath })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification('Folder renamed successfully', 'success');
            fetchDirectoryStructure();  // Refresh the file tree
        } else {
            showNotification('Error renaming folder: ' + data.message, 'error');
        }
    })
    .catch(error => {
        showNotification('Error: ' + error.message, 'error');
    });
}


function getAIExplaination(prompt, selectedCode) {
    fetch('/ai_explaination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, code: selectedCode })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showExplanationModal(data.explaination);
        } else {
            showNotification('Error getting AI explanation: ' + data.message, 'error');
        }
    })
    .catch(error => {
        showNotification('Error: ' + error.message, 'error');
    });
}

function showExplanationModal(explanation) {
    const modal = document.getElementById('explanationModal');
    const modalContent = document.getElementById('modalContent');

    modalContent.innerHTML = marked.parse(explanation);
    modal.style.display = 'flex';

    // Close the modal when clicking outside of it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
}


function getAiSuggestion(prompt, selectedCode) {
    fetch('/ai_suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, code: selectedCode })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            replaceSelectedCode(data.suggestion);
        } else {
            showNotification('Error getting AI suggestion: ' + data.message, 'error');
        }
    })
    .catch(error => {
        showNotification('Error: ' + error.message, 'error');
    });
}

function getAiRefactoring(selectedCode) {
    fetch('/ai_refactoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: "", code: selectedCode })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            replaceSelectedCode(data.refactor);
        } else {
            showNotification('Error getting AI refactoring: ' + data.message, 'error');
        }
    })
    .catch(error => {
        showNotification('Error: ' + error.message, 'error');
    });
}

function replaceSelectedCode(newCode) {
    const startLineNumber = parseInt(commandPalette.dataset.selectionStartLineNumber);
    const startColumn = parseInt(commandPalette.dataset.selectionStartColumn);
    const endLineNumber = parseInt(commandPalette.dataset.selectionEndLineNumber);
    const endColumn = parseInt(commandPalette.dataset.selectionEndColumn);

    const range = new monaco.Range(startLineNumber, startColumn, endLineNumber, endColumn);
    
    editor.executeEdits('ai-suggestion', [{
        range: range,
        text: newCode,
        forceMoveMarkers: true
    }]);
}


function showNotification(message, type) {
    console.log(`${type}: ${message}`);
    const e = document.getElementById('notification');
    e.innerText = message;
    e.style.marginRight = "-50px";
    e.style.color = "#a6e3a1"
}

function removeNotification(message, type) {
    const e = document.getElementById('notification');
    e.innerText = "";
}

setInterval(removeNotification, 5000);




function fetchDirectoryStructure() {
    fetch('/get_directory_structure')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                console.log("Fetched new directory structure");
                updateFileTree(data.structure);
            } else {
                showNotification('Error fetching directory structure: ' + data.message, 'error');
            }
        })
        .catch(error => {
            showNotification('Error: ' + error.message, 'error');
        });
}



function updateFileTree(structure) {
    const fileTree = document.getElementById('file-tree');
    const previouslyExpanded = new Set(expandedFolders);  // Create a copy
    fileTree.innerHTML = ''; // Clear the existing tree
    fileTree.appendChild(createFileTreeItem(structure, 0));
    expandedFolders = previouslyExpanded;  // Restore the expanded folders
    restoreExpandedFolders();
}
function createFileTreeItem(item, depth = 0) {
    const itemElement = document.createElement('div');
    itemElement.className = 'file-tree-item';
    itemElement.style.paddingLeft = `${depth * 20}px`; // Indentation
    itemElement.setAttribute('data-path', item.path);

    const fullPath = item.path;
    
    const iconSvg = item.type === 'directory' 
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';

    const itemContent = document.createElement('div');
    itemContent.className = 'file-tree-item-content';
    itemContent.innerHTML = `
        <span class="file-tree-icon">${iconSvg}</span>
        <span class="file-tree-name">${item.name}</span>
    `;
    itemElement.appendChild(itemContent);

    if (item.type === 'directory') {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'file-tree-children';
        childrenContainer.style.display = 'none';

        if (item.children && Array.isArray(item.children)) {
            item.children.forEach(child => {
                childrenContainer.appendChild(createFileTreeItem(child, depth + 1));
            });
        }

        itemElement.appendChild(childrenContainer);

        itemContent.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFolder(itemElement, fullPath);
        });

        // If the folder was previously expanded, expand it now
        if (expandedFolders.has(fullPath)) {
            toggleFolder(itemElement, fullPath);
        }
    } else {
        itemContent.addEventListener('click', () => loadFile(fullPath));
    }

    return itemElement;
}


function toggleFolder(folderElement, fullPath, forceExpand = false) {
    const childrenContainer = folderElement.querySelector('.file-tree-children');
    if (childrenContainer) {
        const isCurrentlyExpanded = childrenContainer.style.display === 'block';
        const shouldExpand = forceExpand || !isCurrentlyExpanded;
        
        childrenContainer.style.display = shouldExpand ? 'block' : 'none';
        folderElement.classList.toggle('expanded', shouldExpand);
        
        if (shouldExpand) {
            expandedFolders.add(fullPath);
        } else {
            expandedFolders.delete(fullPath);
        }
        console.log(`Folder ${fullPath} is now ${shouldExpand ? 'expanded' : 'collapsed'}`);
        console.log("Current expanded folders:", Array.from(expandedFolders));
    }
}

function restoreExpandedFolders() {
    console.log("Restoring expanded folders...");
    console.log("Expanded folders before restore:", Array.from(expandedFolders));
    
    expandedFolders.forEach(path => {
        const folderElement = document.querySelector(`.file-tree-item[data-path="${path}"]`);
        if (folderElement) {
            console.log(`Restoring folder: ${path}`);
            toggleFolder(folderElement, path, true);  // Force expand
        } else {
            console.log(`Folder not found: ${path}`);
            // Optional: Remove paths that no longer exist in the file structure
            // expandedFolders.delete(path);
        }
    });
    
    console.log("Expanded folders after restore:", Array.from(expandedFolders));
}


function openFileTab(filename, content) {
    if (!document.querySelector(`.tab[data-filename="${filename}"]`)) {
        createTab(filename);
    }
    switchToTab(filename);
    currentFile = filename;

    const language = getLanguageFromFilename(filename);
    
    if (!openFiles[filename]) {
        openFiles[filename] = {
            model: monaco.editor.createModel(content, language)
        };
    }
    
    editor.setModel(openFiles[filename].model);
    editor.updateOptions({ language: language });
}

function createTab(filename) {
    const tabsContainer = document.getElementById('tabs-container');
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.setAttribute('data-filename', filename);
    tab.textContent = filename.split('/').pop(); // Show only the file name, not the full path
    tab.onclick = () => switchToTab(filename);
    
    const closeButton = document.createElement('span');
    closeButton.className = 'close-tab';
    closeButton.textContent = '×';
    closeButton.onclick = (e) => {
        e.stopPropagation();
        closeTab(filename);
    };
    
    tab.appendChild(closeButton);
    tabsContainer.appendChild(tab);
}

function switchToTab(filename) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    const tab = document.querySelector(`.tab[data-filename="${filename}"]`);
    if (tab) {
        tab.classList.add('active');
        if (openFiles[filename] && openFiles[filename].model) {
            editor.setModel(openFiles[filename].model);
        } else {
            console.error('Model not found for file:', filename);
        }
    }
}

function closeTab(filename) {
    const tab = document.querySelector(`.tab[data-filename="${filename}"]`);
    if (tab) {
        tab.remove();
        if (openFiles[filename] && openFiles[filename].model) {
            openFiles[filename].model.dispose();
        }
        delete openFiles[filename];
        if (Object.keys(openFiles).length > 0) {
            switchToTab(Object.keys(openFiles)[0]);
        } else {
            editor.setModel(monaco.editor.createModel('', 'plaintext'));
        }
    }
}







function addNewFile(filePath) {
    fetch('/add_file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification('File created successfully: ' + filePath, 'success');
            fetchDirectoryStructure();  // Refresh the file tree
        } else {
            showNotification('Error creating file: ' + data.message, 'error');
        }
    })
    .catch(error => {
        showNotification('Error: ' + error.message, 'error');
    });
}

function renameFile(oldPath, newPath) {
    fetch('/rename_file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_path: oldPath, new_path: newPath })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification('File renamed successfully', 'success');
            fetchDirectoryStructure();  // Refresh the file tree
            if (openFiles[oldPath]) {
                openFiles[newPath] = openFiles[oldPath];
                delete openFiles[oldPath];
                closeTab(oldPath);
                openFileTab(newPath, openFiles[newPath]);
            }
        } else {
            showNotification('Error renaming file: ' + data.message, 'error');
        }
    })
    .catch(error => {
        showNotification('Error: ' + error.message, 'error');
    });
}

function deleteFile(filePath) {
    if (confirm(`Are you sure you want to delete "${filePath}"?`)) {
        fetch('/delete_file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_path: filePath })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showNotification('File deleted successfully: ' + filePath, 'success');
                fetchDirectoryStructure();  // Refresh the file tree
                closeTab(filePath);  // Close the tab if the file was open
            } else {
                showNotification('Error deleting file: ' + data.message, 'error');
            }
        })
        .catch(error => {
            showNotification('Error: ' + error.message, 'error');
        });
    }
}




let currentModel = "openai/gpt-4o-mini";

document.addEventListener('DOMContentLoaded', function() {
    const modelMenuTrigger = document.getElementById('model-menu-trigger');
    const modelMenu = document.getElementById('model-menu');
    const modelOptions = document.querySelectorAll('.model-option');

    modelMenuTrigger.addEventListener('click', function(e) {
        e.stopPropagation();
        modelMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', function() {
        modelMenu.classList.add('hidden');
    });

    modelOptions.forEach(option => {
        option.addEventListener('click', function() {
            currentModel = this.dataset.model;
            modelMenu.classList.add('hidden');
            console.log('Selected model:', currentModel);
        });
    });
});

function sendMessage() {
    const chatInputArea = document.getElementById('chat-input-area');
    const message = chatInputArea.innerText.trim();
    if (message) {
        addMessageToChat('user', message);
        chatInputArea.innerText = '';

        const currentCode = editor.getValue();
        const taggedFiles = parseTaggedFiles(message);

        fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                code: currentCode, 
                message: message,
                taggedFiles: taggedFiles,
                model: currentModel
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                addMessageToChat('ai', data.response);
            } else {
                addMessageToChat('ai', 'Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            addMessageToChat('ai', 'An error occurred while processing your request.');
        });
    }
}





function updateGitInfo() {
    fetch('/git_info')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const gitStatusBar = document.getElementById('git-status-bar');
                gitStatusBar.innerHTML = `
                    <span title="Current Branch">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="6" y1="3" x2="6" y2="15"></line>
                            <circle cx="18" cy="6" r="3"></circle>
                            <circle cx="6" cy="18" r="3"></circle>
                            <path d="M18 9a9 9 0 0 1-9 9"></path>
                        </svg>
                        ${data.branch}
                    </span>
                    <span title="Latest Commit">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="4"></circle>
                            <line x1="1.05" y1="12" x2="7" y2="12"></line>
                            <line x1="17.01" y1="12" x2="22.96" y2="12"></line>
                        </svg>
                        ${data.commit}
                    </span>
                    <span title="Modified Files">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="12" y1="18" x2="12" y2="12"></line>
                            <line x1="9" y1="15" x2="15" y2="15"></line>
                        </svg>
                        ${data.modified_files}
                    </span>
                    <span title="Unpushed Commits">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="19" x2="12" y2="5"></line>
                            <polyline points="5 12 12 5 19 12"></polyline>
                        </svg>
                        ${data.unpushed_commits}
                    </span>
                `;
            } else {
                console.error('Failed to fetch Git info:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching Git info:', error);
        });
}



function clearChatSession() {
    fetch('/clear_chat_session', {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification('Chat session cleared', 'success');
            // Clear the chat messages in the UI
            document.getElementById('chat-messages').innerHTML = '';
        } else {
            showNotification('Error clearing chat session: ' + data.message, 'error');
        }
    })
    .catch(error => {
        showNotification('Error: ' + error.message, 'error');
    });
}

// Add this to your existing DOMContentLoaded event listener or create a new one
document.addEventListener('DOMContentLoaded', function() {
    const clearChatButton = document.getElementById('clear-chat-button');
    if (clearChatButton) {
        clearChatButton.addEventListener('click', clearChatSession);
    }
});


document.addEventListener('DOMContentLoaded', updateGitInfo);





function showGitPushPopup() {
    document.getElementById('git-push-popup').classList.remove('hidden');
}

function closeGitPushPopup() {
    document.getElementById('git-push-popup').classList.add('hidden');
}

function executeGitPush() {
    const commitMessage = document.getElementById('commit-message').value;
    if (!commitMessage) {
        showNotification('Please enter a commit message', 'error');
        return;
    }

    fetch('/git_push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commit_message: commitMessage }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification('Git push successful', 'success');
            closeGitPushPopup();
            updateGitInfo();  // Update the Git info display
        } else {
            showNotification('Git push failed: ' + data.message, 'error');
        }
    })
    .catch(error => {
        showNotification('Error: ' + error.message, 'error');
    });
}



// Simple Pomodoro Timer with Alerts
let timer;
let timeLeft = 25 * 60; // 25 minutes in seconds
let isWorkSession = true;
let isRunning = false;

function togglePomodoro() {
    if (isRunning) {
        stopPomodoro();
    } else {
        startPomodoro();
    }
}

function startPomodoro() {
    if (timer) {
        clearInterval(timer);
    }

    isRunning = true;
    showNotification("Pomodoro timer started. 25-minute work session begins now.");

    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
        } else {
            clearInterval(timer);
            if (isWorkSession) {
                showNotification("25-minute work session complete! 5-minute break starts now.");
                timeLeft = 5 * 60; // 5 minutes break
                isWorkSession = false;
            } else {
                showNotification("5-minute break over! 25-minute work session starts now.");
                timeLeft = 25 * 60; // 25 minutes work session
                isWorkSession = true;
            }
            startPomodoro(); // Automatically start the next session
        }
    }, 1000);
}

function stopPomodoro() {
    clearInterval(timer);
    isRunning = false;
    showNotification("Pomodoro timer stopped.");
}

// Event listener for Ctrl+T
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 't') {
        event.preventDefault(); // Prevent default browser behavior
        togglePomodoro();
    }
});



setInterval(analyzeReadability, 10000);
            
                        
function analyzeReadability() {
    const currentCode = editor.getValue();
    
    fetch('/analyze_readability', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: currentCode }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
          console.log("Your file is rated:")
          console.log(data.score)
        } else {
          console.log("Error fetching code score")
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An error occurred while analyzing code readability', 'error');
    });
}
