#!/usr/bin/env python
"""
Standalone Django server for PyInstaller bundle.
"""
import os
import sys
import argparse
from pathlib import Path

# CRITICAL: Set up paths BEFORE any Django imports
# The frozen app's sys._MEIPASS contains the extracted bundle
if getattr(sys, 'frozen', False):
    # Running as PyInstaller bundle
    BASE_DIR = Path(sys._MEIPASS)
else:
    # Running as script
    BASE_DIR = Path(__file__).resolve().parent

BACKEND_DIR = BASE_DIR / "backend"

# Add to sys.path - backend must come first for Django apps
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BACKEND_DIR))

# Set Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bincnote.settings")

# Now import and setup Django
import django
django.setup()

# Get WSGI application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--host", type=str, default="127.0.0.1")
    args = parser.parse_args()
    
    print(f"Starting BincNote server on http://{args.host}:{args.port}")
    print("Press Ctrl+C to stop")
    
    try:
        from wsgiref.simple_server import make_server
        with make_server(args.host, args.port, application) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")