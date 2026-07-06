# -*- mode: python ; coding: utf-8 -*-

import sys
import os
from pathlib import Path

# Get the base directory - use sys.argv[0] or current working directory
BASE_DIR = Path(os.path.dirname(os.path.abspath(sys.argv[0])))
BACKEND_DIR = BASE_DIR / "backend"

# Collect all data files
def collect_data_files(source_dir, dest_prefix):
    """Collect all files from source_dir for PyInstaller"""
    data_files = []
    for root, dirs, files in os.walk(source_dir):
        for f in files:
            src = os.path.join(root, f)
            # Get relative path from source_dir (not BASE_DIR)
            rel = os.path.relpath(root, source_dir)
            if rel == ".":
                rel = ""
            data_files.append((src, os.path.join(dest_prefix, rel)))
    return data_files

# Backend template files (React build)
template_files = collect_data_files(BACKEND_DIR / "templates", "templates")

# Backend static files
static_files = collect_data_files(BACKEND_DIR / "staticfiles", "staticfiles")

# Apps directory (Python source code)
apps_files = collect_data_files(BACKEND_DIR / "apps", "apps")

# Bincnote directory (Django project config)
bincnote_files = collect_data_files(BACKEND_DIR / "bincnote", "bincnote")

# Database file - DO NOT bundle, will be created at runtime
# db_files = []
# db_path = BACKEND_DIR / "db.sqlite3"
# if db_path.exists():
#     db_files.append((str(db_path), "db.sqlite3"))

# Media files
media_files = []
media_path = BACKEND_DIR / "media"
if media_path.exists():
    media_files = collect_data_files(media_path, "media")

# All data files
all_data_files = template_files + static_files + apps_files + bincnote_files + media_files  # db_files commented out

# Hidden imports for Django
hidden_imports = [
    'django',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authentication',
    'rest_framework.permissions',
    'rest_framework.parsers',
    'rest_framework.renderers',
    'rest_framework.schemas',
    'rest_framework.settings',
    'corsheaders',
    'corsheaders.middleware',
    'whitenoise',
    'whitenoise.middleware',
    'whitenoise.storage',
    'apps',
    'apps.__init__',
    'apps.accounts',
    'apps.accounts.urls',
    'apps.documents',
    'apps.documents.urls',
    'apps.grids',
    'apps.grids.urls',
    'apps.boards',
    'apps.boards.urls',
    'apps.calendar_app',
    'apps.calendar_app.urls',
    'apps.ai_app',
    'apps.ai_app.urls',
    'bincnote.settings',
    'bincnote.urls',
    'bincnote.api_urls',
    'bincnote.wsgi',
    'bincnote.asgi',
    'dotenv',
    'sqlite3',
]

a = Analysis(
    ['standalone_server.py'],
    pathex=[str(BASE_DIR), str(BACKEND_DIR)],
    binaries=[],
    datas=all_data_files,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'numpy',
        'pandas',
        'PIL',
        'test',
        'unittest',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='BincNote',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
    # version='1.0.0',  # Removed - was causing FileNotFoundError
)

# Also create a coll directory version for easier debugging
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='BincNote',
)