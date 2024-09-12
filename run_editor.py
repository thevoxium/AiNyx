import os
import sys
import webbrowser
from flask import Flask
from app import app

def main():
    if len(sys.argv) != 2:
        print("Usage: python run_editor.py <directory>")
        sys.exit(1)
    
    # Get the absolute path of the script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Change the working directory to where the script is located
    os.chdir(script_dir)
    
    # Get the absolute path of the target directory
    target_directory = os.path.abspath(sys.argv[1])
    if not os.path.isdir(target_directory):
        print(f"Error: {target_directory} is not a valid directory")
        sys.exit(1)
    
    # Set the target directory as an environment variable
    os.environ['EDITOR_TARGET_DIR'] = target_directory
    
    # Open the browser
    webbrowser.open('http://127.0.0.1:5000')
    
    # Run the Flask app
    app.run(debug=True)

if __name__ == "__main__":
    main()