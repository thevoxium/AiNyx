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

function browseDirectory(path) {
    fetch(`/browse?path=${encodeURIComponent(path)}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                currentPath = data.current_path;
                updateDirectoryBrowser(data);
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

function loadFile(filename) {
    if (openFiles[filename]) {
        switchToTab(filename);
        return;
    }

    fetch(`/file/${filename}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                openFiles[filename] = data.content;
                openFileTab(filename, data.content);
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
    editor.updateOptions({ language: filename.endsWith('.cpp') ? 'cpp' : 'plaintext' });
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
        }
    }
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
    if (!currentFile || !currentFile.endsWith('.cpp')) {
        showNotification('Please select a C++ file to run', 'error');
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
    const resizer1 = document.getElementById('resizer-1');
    const resizer2 = document.getElementById('resizer-2');
    const resizer3 = document.getElementById('resizer-3');

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

        if (currentResizer === resizer1) {
            const newSidebarWidth = e.clientX;
            sidebar.style.width = `${newSidebarWidth}px`;
        } else if (currentResizer === resizer2) {
            const newIoContainerWidth = window.innerWidth - e.clientX;
            ioContainer.style.width = `${newIoContainerWidth}px`;
        }else if (currentResizer === resizer3){
            const chatContainerWidth = window.innerWidth - e.clientX;
            chatContainer.style.width = `${chatContainerWidth}px`;
        }

        // Ensure the Monaco editor resizes properly
        if (editor) {
            editor.layout();
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

        const code = editor.getValue();

        fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: code, message: message }),
        })
        .then(response => response.json())
        .then(data => {
            console.log("Received data:", data);  // Add this line for debugging
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

function addMessageToChat(sender, content) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', sender + '-message');
    
    if (sender === 'ai') {
        messageElement.innerHTML = marked.parse(content);
        
        // Apply syntax highlighting to code blocks
        messageElement.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    } else {
        messageElement.textContent = content;
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




document.getElementById('chat-input-area').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

