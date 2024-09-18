from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, emit
from datetime import timedelta
import os
import subprocess
import tempfile
from openai import OpenAI
import markdown
import psutil
import pty
import select
import termios
import struct
import fcntl
import logging
import re
import json
import shutil

import anthropic
from flask import send_from_directory




app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # Replace with a real secret key

app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False

api_key_anthropic = os.environ.get("ANTHROPIC")
client_anthropic = anthropic.Anthropic(
    api_key=api_key_anthropic,
)




socketio = SocketIO(app)
# Configure OpenAI API
client = OpenAI(                                                                                               
        base_url="https://openrouter.ai/api/v1",                                                                   
        api_key=os.environ.get("OPEN_ROUTER_KEY"),                                                                                           
    )  


SESSION_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.editor_session')
os.makedirs(SESSION_DIR, exist_ok=True)
SESSION_FILE = os.path.join(SESSION_DIR, 'session_state.json')

CHAT_SESSION_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.editor_session')
CHAT_SESSION_FILE = os.path.join(CHAT_SESSION_DIR, '.chat_session.json')


def load_chat_session():
    if os.path.exists(CHAT_SESSION_FILE):
        with open(CHAT_SESSION_FILE, 'r') as f:
            return json.load(f)
    return {"conversation_history": [], "tagged_file_contents": {}}

def save_chat_session(chat_session):
    with open(CHAT_SESSION_FILE, 'w') as f:
        json.dump(chat_session, f, indent=2)


def load_session_state():
    try:
        if os.path.exists(SESSION_FILE) and os.path.getsize(SESSION_FILE) > 0:
            with open(SESSION_FILE, 'r') as f:
                return json.load(f)
    except json.JSONDecodeError:
        print(f"Error decoding JSON from {SESSION_FILE}. Using default state.")
    except Exception as e:
        print(f"Error loading session state: {str(e)}. Using default state.")
    
    return {"selected_directory": os.getcwd()}

def save_session_state(state):
    try:
        with open(SESSION_FILE, 'w') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"Error saving session state: {str(e)}")



@app.route('/')
def index():
    return render_template('index.html')



@app.route('/browse_directory', methods=['GET'])
def browse_directory():

    directory = os.getcwd()


    if directory:
        try:
            items = os.listdir(directory)
            directories = [d for d in items if os.path.isdir(os.path.join(directory, d))]
            files = [f for f in items if os.path.isfile(os.path.join(directory, f))]
            session['current_directory'] = os.path.abspath(directory)  # Use absolute path
            print('current_directory')
            print(session['current_directory'])


            session_state = load_session_state()
            print("session_state")
            print(session_state)
            session_state["selected_directory"] = os.path.abspath(directory)
            save_session_state(session_state)


            return jsonify({
                "status": "success",
                "current_path": session['current_directory'],
                "directories": directories,
                "files": files
            })
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)})
    else:
        return jsonify({"status": "cancelled"})


@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

@app.route('/service-worker.js')
def service_worker():
    return send_from_directory('static', 'service-worker.js')


@app.route('/file/<path:filepath>')
def get_file_content(filepath):
    try:
        session_state = load_session_state()
        current_directory = session_state.get("selected_directory", os.getcwd())
        full_path = '/'+filepath     
        # Ensure the requested file is within the current directory
        if not os.path.abspath(full_path).startswith(os.path.abspath(current_directory)):
            return jsonify({"status": "error", "message": "Access denied"})
        
        if os.path.isfile(full_path):
            with open(full_path, 'r') as file:
                content = file.read()
            return jsonify({"status": "success", "content": content})
        else:
            return jsonify({"status": "error", "message": "File not found"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})




@app.route('/select_directory', methods=['POST'])
def select_directory():
    directory = request.json['directory']
    if os.path.isdir(directory):
        session['current_directory'] = directory
        return jsonify({"status": "success", "directory": directory})
    else:
        return jsonify({"status": "error", "message": "Invalid directory"})

@app.route('/files')
def get_files():
    directory = session.get('current_directory', '')
    if not directory:
        return jsonify({"status": "error", "message": "No directory selected"})
    
    files = [f for f in os.listdir(directory) if os.path.isfile(os.path.join(directory, f))]
    return jsonify({"status": "success", "files": files})





def create_directory_structure(path):
    structure = {"name": os.path.basename(path), "type": "directory", "path": path, "children": []}

    try:
        with os.scandir(path) as entries:
            for entry in entries:
                if entry.is_dir():
                    structure["children"].append(create_directory_structure(entry.path))
                else:
                    structure["children"].append({
                        "name": entry.name,
                        "type": "file",
                        "path": entry.path
                    })
    except PermissionError:
        structure["children"].append({"name": "Permission Denied", "type": "error"})
    return structure


@app.route('/get_directory_structure')
def get_directory_structure():
    try:
        print("get director structure")

        session_state = load_session_state()
        current_directory = session_state.get("selected_directory", os.getcwd())

        print(current_directory)

        structure = create_directory_structure(current_directory)
        return jsonify({
            "status": "success",
            "current_directory": current_directory,
            "structure": structure
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@app.route('/save', methods=['POST'])
def save_file():
    data = request.json
    filename = data['filename']
    content = data['content']
    directory = session.get('current_directory', '')
    if not directory:
        return jsonify({"status": "error", "message": "No directory selected"})
    
    file_path = os.path.join(directory, filename)
    try:
        with open(file_path, 'w') as file:
            file.write(content)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/run', methods=['POST'])
def run_code():
    data = request.json
    filename = data['filename']
    user_input = data.get('input', '')
    directory = session.get('current_directory', '')
    if not directory:
        return jsonify({"status": "error", "message": "No directory selected"})
    
    file_path = os.path.join(directory, filename)
    
    if filename.endswith('.cpp'):
        with tempfile.NamedTemporaryFile(suffix='.exe', delete=False) as temp_exe:
            executable = temp_exe.name
        
        compile_command = f"g++ {file_path} -o {executable}"
        compile_process = subprocess.run(compile_command, shell=True, capture_output=True, text=True)
        
        if compile_process.returncode != 0:
            return jsonify({"status": "error", "output": f"Compilation error:\n{compile_process.stderr}"})
        
        try:
            run_process = subprocess.run(executable, input=user_input, shell=True, capture_output=True, text=True, timeout=5)
            output = run_process.stdout
            error = run_process.stderr
            
            if run_process.returncode != 0:
                return jsonify({"status": "error", "output": f"Runtime error:\n{error}"})
            
            return jsonify({"status": "success", "output": output or "Program ran successfully, but produced no output."})
        except subprocess.TimeoutExpired:
            return jsonify({"status": "error", "output": "Program execution timed out after 5 seconds."})
        except Exception as e:
            return jsonify({"status": "error", "output": f"An error occurred: {str(e)}"})
        finally:
            os.remove(executable)

    elif filename.endswith('.py'):
    # Run Python code
        try:
            run_process = subprocess.run(['python', file_path], input=user_input, text=True, capture_output=True, timeout=5)
            output = run_process.stdout
            error = run_process.stderr

            if run_process.returncode != 0:
                return jsonify({"status": "error", "output": f"Runtime error:\n{error}"})

            return jsonify({"status": "success", "output": output or "Program ran successfully, but produced no output."})
        except subprocess.TimeoutExpired:
            return jsonify({"status": "error", "output": "Program execution timed out after 5 seconds."})
        except Exception as e:
            return jsonify({"status": "error", "output": f"An error occurred: {str(e)}"})



@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    code = data['code']
    user_message = data['message']
    tagged_files = data.get('taggedFiles', [])
    model = data.get('model', 'openai/gpt-4o-mini')  # Default to GPT-4o-mini if not specified
    print(model)
    
    # Load the current chat session
    chat_session = load_chat_session()
    
    # Fetch content of newly tagged files and add to existing tagged files
    session_state = load_session_state()
    current_directory = session_state.get("selected_directory", os.getcwd())
    for file_path in tagged_files:
        if file_path not in chat_session['tagged_file_contents']:
            full_path = os.path.join(current_directory, file_path)
            if os.path.isfile(full_path):
                with open(full_path, 'r') as file:
                    chat_session['tagged_file_contents'][file_path] = file.read()
            else:
                chat_session['tagged_file_contents'][file_path] = f"File not found: {file_path}"
    
    # Prepare the prompt with all tagged file contents
    prompt = f"User's question: {user_message}\n\n"
    prompt += f"Current file contents:\n{code}\n\n"
    for file_path, content in chat_session['tagged_file_contents'].items():
        prompt += f"Contents of {file_path}:\n{content}\n\n"
    
    # Add the new prompt to the conversation history
    chat_session['conversation_history'].append({"role": "user", "content": prompt})
    print("Current conversation history:")
    print(chat_session['conversation_history'])
    
    # Prepare the messages for the API call
    messages = [
        {"role": "system", "content": "You are a helpful coding assistant. The user will provide you with code and questions about it. Always give your response in markdown format. It should be always markdown, remember that."},
    ] + chat_session['conversation_history']
    
    try:
        if model == "anthropic/claude-3.5-sonnet":
            response = client_anthropic.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=10000,
                temperature=0,
                system="You are a helpful coding assistant. The user will provide you with code and questions about it. Always return your output in markdown so that i can correctly render it.",
                messages=chat_session['conversation_history']
            )
        else:
            response = client.chat.completions.create(
                model=model,
                messages=messages
            )

        ai_response = ""

        if model == "anthropic/claude-3.5-sonnet":
            ai_response = response.content[0].text
        else:
            ai_response = response.choices[0].message.content
        
        # Add the AI's response to the conversation history
        chat_session['conversation_history'].append({"role": "assistant", "content": ai_response})
        
        # Limit the conversation history to the last 10 messages (5 exchanges)
        if len(chat_session['conversation_history']) > 10:
            chat_session['conversation_history'] = chat_session['conversation_history'][-10:]
        
        # Save the updated chat session
        save_chat_session(chat_session)
        
        return jsonify({"status": "success", "response": ai_response})
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"status": "error", "message": str(e)})

# Add this route to clear the chat session
@app.route('/clear_chat_session', methods=['POST'])
def clear_chat_session():
    if os.path.exists(CHAT_SESSION_FILE):
        os.remove(CHAT_SESSION_FILE)
    return jsonify({"status": "success", "message": "Chat session cleared"})

# Call this function when your Flask app starts
def initialize_chat_session():
    if not os.path.exists(CHAT_SESSION_FILE):
        save_chat_session({"conversation_history": [], "tagged_file_contents": {}})



@app.route('/ai_suggestion', methods=['POST'])
def ai_suggestion():
    data = request.json
    prompt = data['prompt']
    selected_code = data['code']
    
    try:
        # Prepare the messages for the API call
        messages = [
            {"role": "system", "content": "You are an AI coding assistant. Provide code suggestions based on the given prompt and selected code. Only return the suggested code, without any explanations or markdown formatting."},
            {"role": "user", "content": f"Prompt: {prompt}\n\nSelected Code:\n{selected_code}"}
        ]
        
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",  # You can change this to the desired model
            messages=messages
        )
        
        ai_suggestion = response.choices[0].message.content.strip()
        
        return jsonify({"status": "success", "suggestion": ai_suggestion})
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"status": "error", "message": str(e)})




def get_current_directory():
    return session.get('current_directory', os.getcwd())



@app.route('/hardware_stats')
def hardware_stats():
    cpu_usage = psutil.cpu_percent()
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')

    stats = {
        'cpu_usage': round(cpu_usage, 1),
        'memory_used': round(memory.used / (1024**3), 1),
        'memory_total': round(memory.total / (1024**3), 1),
        'disk_used': round(disk.used / (1024**3), 1),
        'disk_total': round(disk.total / (1024**3), 1)
    }
    
    logging.info(f"Hardware stats: {stats}")
    return jsonify(stats)



@socketio.on('connect', namespace='/terminal')
def terminal_connect():
    print('Client connected to terminal')

@socketio.on('disconnect', namespace='/terminal')
def terminal_disconnect():
    print('Client disconnected from terminal')

@socketio.on('command', namespace='/terminal')
def handle_command(command):
    print(f'Received command: {command}')
    try:
        # Execute the command
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=10)
        output = result.stdout + result.stderr
        if not output:
            output = f"Command executed: {command}\n"
    except subprocess.TimeoutExpired:
        output = "Command execution timed out\n"
    except Exception as e:
        output = f"Error executing command: {str(e)}\n"
    
    emit('output', output)




import html

@app.route('/git_diff', methods=['POST'])
def git_diff():
    try:
        directory = session.get('current_directory', '')
        if not directory:
            return jsonify({"status": "error", "message": "No directory selected"})
        
        commit_hash = request.json.get('commit_hash', 'HEAD')
        
        result = subprocess.run(['git', 'diff', commit_hash],
                                cwd=directory,
                                capture_output=True,
                                text=True,
                                check=True)
        
        diff_lines = result.stdout.split('\n')
        processed_diff = []
        current_file = ""
        line_number_old = 0
        line_number_new = 0
        
        for line in diff_lines:
            # Escape HTML characters to prevent rendering
            escaped_line = html.escape(line)
            
            if line.startswith('diff --git'):
                if current_file:
                    processed_diff.append('</table></div>')
                current_file = line.split()[-1].split('/')[-1]
                processed_diff.append(f'<div class="diff-file"><h3>{html.escape(current_file)}</h3><table>')
                line_number_old = 0
                line_number_new = 0
            elif line.startswith('+++') or line.startswith('---'):
                processed_diff.append(f'<tr><td colspan="3" class="diff-header">{escaped_line}</td></tr>')
            elif line.startswith('@@'):
                match = re.match(r'@@ -(\d+),\d+ \+(\d+),\d+ @@', line)
                if match:
                    line_number_old = int(match.group(1))
                    line_number_new = int(match.group(2))
                processed_diff.append(f'<tr><td colspan="3" class="diff-header">{escaped_line}</td></tr>')
            else:
                if line.startswith('+'):
                    processed_diff.append(f'<tr class="diff-added"><td></td><td>{line_number_new}</td><td>{escaped_line}</td></tr>')
                    line_number_new += 1
                elif line.startswith('-'):
                    processed_diff.append(f'<tr class="diff-removed"><td>{line_number_old}</td><td></td><td>{escaped_line}</td></tr>')
                    line_number_old += 1
                else:
                    processed_diff.append(f'<tr><td>{line_number_old}</td><td>{line_number_new}</td><td>{escaped_line}</td></tr>')
                    line_number_old += 1
                    line_number_new += 1
        
        if current_file:
            processed_diff.append('</table></div>')
        
        html_diff = '\n'.join(processed_diff)
        
        return jsonify({"status": "success", "diff": html_diff})
    except subprocess.CalledProcessError as e:
        return jsonify({"status": "error", "message": f"Git diff failed: {e.stderr}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})





@app.route('/git_info')
def get_git_info():
    try:
        directory = session.get('current_directory', '')
        if not directory:
            return jsonify({"status": "error", "message": "No directory selected"})

        # Get current branch
        branch = subprocess.check_output(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], 
                                         cwd=directory, text=True).strip()

        # Get commit hash
        commit_hash = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], 
                                              cwd=directory, text=True).strip()

        # Get number of modified files
        status_output = subprocess.check_output(['git', 'status', '--porcelain'], 
                                                cwd=directory, text=True)
        modified_files = len(status_output.splitlines())

        # Get number of unpushed commits
        unpushed = subprocess.check_output(['git', 'log', '@{u}..'], 
                                           cwd=directory, text=True)
        unpushed_commits = len(unpushed.splitlines()) // 6  # Divide by 6 as each commit has 6 lines in the log

        return jsonify({
            "status": "success",
            "branch": branch,
            "commit": commit_hash,
            "modified_files": modified_files,
            "unpushed_commits": unpushed_commits
        })
    except subprocess.CalledProcessError as e:
        return jsonify({"status": "error", "message": f"Git command failed: {str(e)}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})



@app.route('/get_commits', methods=['GET'])
def get_commits():
    try:
        directory = session.get('current_directory', '')
        if not directory:
            return jsonify({"status": "error", "message": "No directory selected"})
        
        result = subprocess.run(['git', 'log', '--pretty=format:%H|%s', '-n', '50'],
                                cwd=directory,
                                capture_output=True,
                                text=True,
                                check=True)
        
        commits = [{'hash': line.split('|')[0], 'message': line.split('|')[1]} 
                   for line in result.stdout.split('\n') if line]
        
        return jsonify({"status": "success", "commits": commits})
    except subprocess.CalledProcessError as e:
        return jsonify({"status": "error", "message": f"Failed to get commits: {e.stderr}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})







@app.route('/add_file', methods=['POST'])
def add_file():
    data = request.json
    file_path = data.get('file_path')
    
    if not file_path:
        return jsonify({"status": "error", "message": "File path is required"})
    
    try:
        session_state = load_session_state()
        current_directory = session_state.get("selected_directory", os.getcwd())
        full_path = os.path.join(current_directory, file_path)
        
        # Create any necessary directories
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # Create the file
        with open(full_path, 'w') as f:
            pass  # Create an empty file
        
        return jsonify({"status": "success", "message": f"File created: {file_path}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/rename_file', methods=['POST'])
def rename_file():
    data = request.json
    old_path = data.get('old_path')
    new_path = data.get('new_path')
    
    if not old_path or not new_path:
        return jsonify({"status": "error", "message": "Both old and new file paths are required"})
    
    try:
        session_state = load_session_state()
        current_directory = session_state.get("selected_directory", os.getcwd())
        full_old_path = os.path.join(current_directory, old_path)
        full_new_path = os.path.join(current_directory, new_path)
        
        if os.path.isfile(full_old_path):
            os.rename(full_old_path, full_new_path)
            return jsonify({"status": "success", "message": f"File renamed from {old_path} to {new_path}"})
        else:
            return jsonify({"status": "error", "message": f"File not found: {old_path}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/delete_file', methods=['POST'])
def delete_file():
    data = request.json
    file_path = data.get('file_path')
    
    if not file_path:
        return jsonify({"status": "error", "message": "File path is required"})
    
    try:
        session_state = load_session_state()
        current_directory = session_state.get("selected_directory", os.getcwd())
        full_path = os.path.join(current_directory, file_path)
        
        if os.path.isfile(full_path):
            os.remove(full_path)
            return jsonify({"status": "success", "message": f"File deleted: {file_path}"})
        else:
            return jsonify({"status": "error", "message": f"File not found: {file_path}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})







@app.route('/add_folder', methods=['POST'])
def add_folder():
    data = request.json
    folder_path = data.get('folder_path')
    
    if not folder_path:
        return jsonify({"status": "error", "message": "Folder path is required"})
    
    try:
        session_state = load_session_state()
        current_directory = session_state.get("selected_directory", os.getcwd())
        full_path = os.path.join(current_directory, folder_path)
        
        os.makedirs(full_path, exist_ok=True)
        
        return jsonify({"status": "success", "message": f"Folder created: {folder_path}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/delete_folder', methods=['POST'])
def delete_folder():
    data = request.json
    folder_path = data.get('folder_path')
    
    if not folder_path:
        return jsonify({"status": "error", "message": "Folder path is required"})
    
    try:
        session_state = load_session_state()
        current_directory = session_state.get("selected_directory", os.getcwd())
        full_path = os.path.join(current_directory, folder_path)
        
        if os.path.isdir(full_path):
            shutil.rmtree(full_path)
            return jsonify({"status": "success", "message": f"Folder deleted: {folder_path}"})
        else:
            return jsonify({"status": "error", "message": f"Folder not found: {folder_path}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/rename_folder', methods=['POST'])
def rename_folder():
    data = request.json
    old_path = data.get('old_path')
    new_path = data.get('new_path')
    
    if not old_path or not new_path:
        return jsonify({"status": "error", "message": "Both old and new folder paths are required"})
    
    try:
        session_state = load_session_state()
        current_directory = session_state.get("selected_directory", os.getcwd())
        full_old_path = os.path.join(current_directory, old_path)
        full_new_path = os.path.join(current_directory, new_path)
        
        if os.path.isdir(full_old_path):
            os.rename(full_old_path, full_new_path)
            return jsonify({"status": "success", "message": f"Folder renamed from {old_path} to {new_path}"})
        else:
            return jsonify({"status": "error", "message": f"Folder not found: {old_path}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})





initialize_chat_session()

if __name__ == '__main__':
    socketio.run(app, debug = True, port = 3000)