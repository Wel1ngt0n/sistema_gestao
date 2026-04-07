import re

def strip_dark_classes(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove dark:classes
        content = re.sub(r'\s*dark:[a-zA-Z0-9\-\/\[\]\#]+', '', content)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Cleaned {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

base_path = r'c:\Users\welin\Downloads\sistema_gestao\frontend\src'
strip_dark_classes(f"{base_path}\\layouts\\CRMLayout.tsx")
strip_dark_classes(f"{base_path}\\components\\Dashboard.tsx")
