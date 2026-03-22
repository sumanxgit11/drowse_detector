import os
import glob

replacements = {
    "DrowseGuard": "Drowse Detector",
    "drowseguard": "drowse_detector"
}

files = glob.glob('templates/*.html') + glob.glob('static/js/*.js') + glob.glob('static/css/*.css') + ['README.md']

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        new_content = new_content.replace(old, new)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
