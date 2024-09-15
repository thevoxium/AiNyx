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
import tkinter as tk
from tkinter import filedialog
import re
import json


app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # Replace with a real secret key

app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False




socketio = SocketIO(app)
# Configure OpenAI API
client = OpenAI(                                                                                               
        base_url="https://openrouter.ai/api/v1",                                                                   
        api_key=os.environ.get("OPEN_ROUTER_KEY"),                                                                                           
    )  


SESSION_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.editor_session')
os.makedirs(SESSION_DIR, exist_ok=True)
SESSION_FILE = os.path.join(SESSION_DIR, 'session_state.json')

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
    root = tk.Tk()
    root.withdraw()
    directory = filedialog.askdirectory()
    root.destroy()

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



@app.route('/file/<path:filepath>')
def get_file_content(filepath):
    try:
        session_state = load_session_state()
        current_directory = session_state.get("selected_directory", os.getcwd())
        full_path = '/'+filepath
        print('#############')
        print(full_path)        
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
    print(path)
    structure = {"name": os.path.basename(path), "type": "directory", "children": []}
    print(structure)
    try:
        with os.scandir(path) as entries:
            for entry in entries:
                if entry.is_dir():
                    structure["children"].append(create_directory_structure(entry.path))
                else:
                    print("&&&&&&&&&&&&&&&&&&&&&&&");
                    print(entry.path)
                    print(path)
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
        print(structure)
        print("check here !!!")
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
    
    # Initialize conversation history if it doesn't exist
    if 'conversation_history' not in session:
        session['conversation_history'] = []

    # Fetch content of tagged files
    tagged_file_contents = {}
    session_state = load_session_state()
    current_directory = session_state.get("selected_directory", os.getcwd())
    for file_path in tagged_files:
        full_path = os.path.join(current_directory, file_path)
        if os.path.isfile(full_path):
            with open(full_path, 'r') as file:
                tagged_file_contents[file_path] = file.read()
        else:
            tagged_file_contents[file_path] = f"File not found: {file_path}"
    
    # Prepare the prompt with tagged file contents
    prompt = f"User's question: {user_message}\n\n"
    prompt += f"Current file contents:\n{code}\n\n"
    for file_path, content in tagged_file_contents.items():
        prompt += f"Contents of {file_path}:\n{content}\n\n"
    
    # Add the new prompt to the conversation history
    session['conversation_history'].append({"role": "user", "content": prompt})
    
    # Prepare the messages for the API call
    messages = [
        {"role": "system", "content": "You are a helpful coding assistant. The user will provide you with code and questions about it. Always give your response in markdown format. It should be always markdown, remember that."},
    ] + session['conversation_history']
    
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages
        )
        
        ai_response = response.choices[0].message.content
        
        # Add the AI's response to the conversation history
        session['conversation_history'].append({"role": "assistant", "content": ai_response})
        
        # Limit the conversation history to the last 10 messages (5 exchanges)
        if len(session['conversation_history']) > 10:
            session['conversation_history'] = session['conversation_history'][-10:]
        
        # Make sure to save the session after modifying it
        session.modified = True
        
        return jsonify({"status": "success", "response": ai_response})
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



if __name__ == '__main__':
    socketio.run(app, debug=True)