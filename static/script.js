let editor;
let openFiles = {};
let currentFile = '';
let currentPath = '/';

require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.30.1/min/vs' } });

require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('editor'), {
        value: '// Select a file to edit',
        language: 'cpp',
        theme: 'vs-dark',
        automaticLayout: true
    });
    browseDirectory('/');
    initializeResizers();
});


let isOpen = true;
function toggleIO() {
    isOpen = !isOpen;
    document.getElementById('io-container').style.display = isOpen ? 'none' : 'flex';
    document.getElementById('io-container').style.display = isOpen ? 'flex' : 'none';
    // Add your logic here to actually open/close the I/O container
}

function updateDirectoryBrowser(data) {
    const directoryList = document.getElementById('directory-list');
    const currentPathElement = document.getElementById('current-path');
    
    currentPathElement.textContent = data.current_path;
    directoryList.innerHTML = '';

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
        fileElement.onclick = () => loadFile(file);
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
    
    if (chatContainer.style.display === 'none') {
        chatContainer.style.display = 'flex';
        editorContainer.style.width = 'calc(100% - 500px)';  // Adjust width for chat
        ioContainer.style.width = '250px';  // Reduce IO container width
    } else {
        chatContainer.style.display = 'none';
        editorContainer.style.width = 'calc(100% - 250px)';  // Restore original width
        ioContainer.style.width = '250px';  // Restore original IO container width
    }
    
    if (editor) {
        editor.layout();
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
                updateDirectoryBrowser(data);
            } else if (data.status === 'cancelled') {
                console.log('Directory selection cancelled');
            } else {
                showNotification('Error browsing directory: ' + data.message, 'error');
            }
        });
}

function updateDirectoryBrowser(data) {
    const directoryList = document.getElementById('directory-list');
    const currentPathElement = document.getElementById('current-path');
    
    currentPathElement.textContent = data.current_path;
    directoryList.innerHTML = '';

    data.directories.forEach(dir => {
        const dirElement = document.createElement('div');
        dirElement.textContent = dir;
        dirElement.onclick = () => loadFile(dir);
        directoryList.appendChild(dirElement);
    });

    data.files.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.textContent = file;
        fileElement.onclick = () => loadFile(file);
        directoryList.appendChild(fileElement);
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






function browseDirectory() {
    fetch('/browse_directory')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                fetchDirectoryStructure();
            } else {
                showNotification('Error browsing directory: ' + data.message, 'error');
            }
        });
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




let currentDirectory = '';


function loadFile(fullPath) {
    // Remove the leading '/' if it exists to match the route in Flask
    const path = fullPath.startsWith('/') ? fullPath.slice(1) : fullPath;
    fetch(`/file/${path}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                openFiles[fullPath] = data.content;
                openFileTab(fullPath, data.content);
            } else {
                showNotification('Error loading file: ' + data.message, 'error');
            }
        });
}













/////////////////////
function loadFile(fullPath) {
    // Remove the leading '/' if it exists to match the route in Flask
    const path = fullPath.startsWith('/') ? fullPath.slice(1) : fullPath;
    fetch(`/file/${path}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                openFiles[fullPath] = data.content;
                openFileTab(fullPath, data.content);
            } else {
                showNotification('Error loading file: ' + data.message, 'error');
            }
        });
}

function openFileTab(filename, content) {
    if (!document.querySelector(`.tab[data-filename="${filename}"]`)) {
        createTab(filename);
    }
    switchToTab(filename);
}

function createTab(filename) {
    const tabsContainer = document.getElementById('tabs-container');
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.setAttribute('data-filename', filename);
    tab.textContent = filename;
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
    if (currentFile === filename) return;

    currentFile = filename;
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-filename') === filename) {
            tab.classList.add('active');
        }
    });
    editor.setValue(openFiles[filename]);
    
    // Update the editor's language based on the file extension
    const fileExtension = filename.split('.').pop().toLowerCase();
    let language = 'plaintext';
    if (fileExtension === 'cpp' || fileExtension === 'c' || fileExtension === 'h') {
        language = 'cpp';
    } else if (fileExtension === 'py') {
        language = 'python';
    }
    editor.updateOptions({ language: language });
}

function closeTab(filename) {
    delete openFiles[filename];
    const tab = document.querySelector(`.tab[data-filename="${filename}"]`);
    if (tab) tab.remove();

    if (currentFile === filename) {
        const remainingTabs = Object.keys(openFiles);
        if (remainingTabs.length > 0) {
            switchToTab(remainingTabs[remainingTabs.length - 1]);
        } else {
            editor.setValue('// Select a file to edit');
            currentFile = '';
            editor.updateOptions({ language: 'plaintext' });
        }
    }
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
}

function hideCommandPalette() {
    commandPalette.classList.add('hidden');
    commandInput.value = '';
}

function handleCommandInput(e) {
    const input = e.target.value.toLowerCase();
    if (input.startsWith('add:')) {
        commandList.innerHTML = '<li>Create a new file</li>';
    } else {
        commandList.innerHTML = '';
    }
}

function executeCommand(command) {
    if (command.toLowerCase().startsWith('add:')) {
        const filePath = command.slice(4).trim();
        addNewFile(filePath);
    }
    hideCommandPalette();
}



function showNotification(message, type) {
    console.log(`${type}: ${message}`);
    // Implement a visual notification system here
}









//////////////////////
function fetchDirectoryStructure() {
    fetch('/get_directory_structure')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
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
    fileTree.innerHTML = ''; // Clear the existing tree
    fileTree.appendChild(createFileTreeItem(structure));
}

function createFileTreeItem(item) {
    const itemElement = document.createElement('div');
    itemElement.className = 'file-tree-item';

    const iconSvg = item.type === 'directory' 
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';

    itemElement.innerHTML = `
        <span class="file-tree-icon">${iconSvg}</span>
        <span class="file-tree-name">${item.name}</span>
    `;

    if (item.type === 'directory') {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'file-tree-children';
        childrenContainer.style.display = 'none';

        if (item.children && Array.isArray(item.children)) {
            item.children.forEach(child => {
                childrenContainer.appendChild(createFileTreeItem(child));
            });
        }

        itemElement.appendChild(childrenContainer);

        itemElement.querySelector('.file-tree-name').addEventListener('click', () => {
            childrenContainer.style.display = childrenContainer.style.display === 'none' ? 'block' : 'none';
            itemElement.classList.toggle('expanded');
        });
    } else {
        itemElement.addEventListener('click', () => loadFile(item.path));
    }

    return itemElement;
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





document.getElementById('chat-input-area').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});


