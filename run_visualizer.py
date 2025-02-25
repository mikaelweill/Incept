#!/usr/bin/env python3
# Curriculum Visualization App Runner
#
# IMPORTANT: This app requires Flask and other dependencies.
# To run this properly:
# 1. Activate the virtual environment: source venv/bin/activate
# 2. Then run this script: python3 run_visualizer.py

import sys
import os

# Add the current directory to the path so we can import the app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.app import app
    
    if __name__ == "__main__":
        print("Starting Curriculum Visualization App...")
        print("Access the app at: http://localhost:5001")
        app.run(debug=True, host="0.0.0.0", port=5001)
except ImportError as e:
    print(f"Error: {e}")
    print("\nMake sure you've activated the virtual environment:")
    print("  source venv/bin/activate")
    print("And installed the required dependencies:")
    print("  pip install flask ijson python-dotenv openai") 