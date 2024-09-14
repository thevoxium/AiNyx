from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, emit
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
from browse import DirectorySelector

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # Replace with a real secret key
socketio = SocketIO(app)
# Configure OpenAI API
client = OpenAI(                                                                                               
        base_url="https://openrouter.ai/api/v1",                                                                   
        api_key=os.environ.get("OPEN_ROUTER_KEY"),                                                                                           
    )  

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/browse_directory', methods=['GET'])
def browse_directory():
    root = tk.Tk()
    root.withdraw()  # Hide the main window
    #dialog = DirectorySelector(root) # Open the directory selection dialog
    directory = filedialog.askdirectory()
    #root.wait_window(dialog.top)
    #directory = dialog.result
    root.destroy()  # Close the Tkinter instance

    
    if directory:
        try:
            items = os.listdir(directory)
            directories = [d for d in items if os.path.isdir(os.path.join(directory, d))]
            files = [f for f in items if os.path.isfile(os.path.join(directory, f))]
            session['current_directory'] = directory
            return jsonify({
                "status": "success",
                "current_path": directory,
                "directories": directories,
                "files": files
            })
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)})
    else:
        return jsonify({"status": "cancelled"})

@app.route('/file/<path:filename>')
def get_file_content(filename):
    directory = session.get('current_directory', '')
    if not directory:
        return jsonify({"status": "error", "message": "No directory selected"})
    
    file_path = os.path.join(directory, filename)
    if not os.path.isfile(file_path):
        return jsonify({"status": "error", "message": f"File not found: {file_path}"})
    
    try:
        with open(file_path, 'r') as file:
            content = file.read()
        return jsonify({"status": "success", "content": content})
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
def run_cpp():
    data = request.json
    filename = data['filename']
    user_input = data.get('input', '')
    directory = session.get('current_directory', '')
    if not directory:
        return jsonify({"status": "error", "message": "No directory selected"})
    
    file_path = os.path.join(directory, filename)
    
    if not filename.endswith('.cpp'):
        return jsonify({"status": "error", "output": "Only C++ files are supported."})
    
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



@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    code = data['code']
    user_message = data['message']
    #print(code)
    
    try:
        response = client.chat.completions.create(
            model="nousresearch/hermes-3-llama-3.1-405b",
            messages=[
                {"role": "system", "content": "You are a helpful coding assistant. The user will provide you with code and questions about it. Always give your response in markdown format. It should be always markdown, remember that."},
                {"role": "user", "content": f"Here's the code:\n\n{code}\n\nUser's question: {user_message}"}
            ]
        )
        
        ai_response = response.choices[0].message.content
        html_response = markdown.markdown(ai_response)
        
        print("AI Response:", html_response)  # Add this line for debugging
        
        return jsonify({"status": "success", "response": ai_response})
    except Exception as e:
        print("Error:", str(e))  # Add this line for debugging
        return jsonify({"status": "error", "message": str(e)})



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
            if line.startswith('diff --git'):
                if current_file:
                    processed_diff.append('</table></div>')
                current_file = line.split()[-1].split('/')[-1]
                processed_diff.append(f'<div class="diff-file"><h3>{current_file}</h3><table>')
                line_number_old = 0
                line_number_new = 0
            elif line.startswith('+++') or line.startswith('---'):
                continue
            elif line.startswith('@@'):
                match = re.match(r'@@ -(\d+),\d+ \+(\d+),\d+ @@', line)
                if match:
                    line_number_old = int(match.group(1))
                    line_number_new = int(match.group(2))
                processed_diff.append(f'<tr><td colspan="3" class="diff-header">{line}</td></tr>')
            else:
                if line.startswith('+'):
                    processed_diff.append(f'<tr class="diff-added"><td></td><td>{line_number_new}</td><td>{line}</td></tr>')
                    line_number_new += 1
                elif line.startswith('-'):
                    processed_diff.append(f'<tr class="diff-removed"><td>{line_number_old}</td><td></td><td>{line}</td></tr>')
                    line_number_old += 1
                else:
                    processed_diff.append(f'<tr><td>{line_number_old}</td><td>{line_number_new}</td><td>{line}</td></tr>')
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


if __name__ == '__main__':
    socketio.run(app, debug=True)