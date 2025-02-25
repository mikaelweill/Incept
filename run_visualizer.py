#!/usr/bin/env python3
"""
Curriculum Visualization App Runner
"""

import sys
import os

# Add the current directory to the path so we can import the app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the app
from app.app import app

if __name__ == "__main__":
    print("="*50)
    print("Starting Curriculum Visualization App")
    print("="*50)
    print("Access the app at: http://localhost:5001")
    print("Press Ctrl+C to stop the server")
    print("="*50)
    app.run(debug=True, host='0.0.0.0', port=5001) 