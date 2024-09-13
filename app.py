from flask import Flask, render_template, request, jsonify, session
import os
import subprocess
import tempfile
from openai import OpenAI
import markdown
import psutil
import logging
import GPUtil
from flask_socketio import SocketIO, emit


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

@app.route('/browse', methods=['GET'])
def browse_directory():
    path = request.args.get('path', '/')
    try:
        items = os.listdir(path)
        directories = [d for d in items if os.path.isdir(os.path.join(path, d))]
        files = [f for f in items if os.path.isfile(os.path.join(path, f))]
        session['current_directory'] = path  # Add this line
        return jsonify({
            "status": "success",
            "current_path": path,
            "directories": directories,
            "files": files
        })
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

@app.route('/file/<path:filename>')
def get_file_content(filename):
    directory = session.get('current_directory', '')
    if not directory:
        return jsonify({"status": "error", "message": "No directory selected"})
    
    file_path = os.path.join(directory, filename)
    if not os.path.isfile(file_path):
        file_path = filename  # If not found, assume it's a full path
    
    try:
        with open(file_path, 'r') as file:
            content = file.read()
        return jsonify({"status": "success", "content": content})
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



@socketio.on('run_command')
def handle_command(command):
    try:
        # Run the command on the server and capture the output
        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
        output, error = process.communicate()
        
        if output:
            emit('command_output', {'data': output})
        if error:
            emit('command_output', {'data': error})
    except Exception as e:
        emit('command_output', {'data': str(e)})

if __name__ == '__main__':
    socketio.run(app, debug = True)