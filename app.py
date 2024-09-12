from flask import Flask, render_template, request, jsonify, session
import os
import subprocess
import tempfile

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # Replace with a real secret key

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

if __name__ == '__main__':
    app.run(debug=True)