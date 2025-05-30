import os
import json
from datetime import datetime

# Create saved_macros directory if it doesn't exist
if not os.path.exists('saved_macros'):
    os.makedirs('saved_macros')

# Initialize or load macro directory
def load_macro_directory():
    if os.path.exists('macro_directory.json'):
        with open('macro_directory.json', 'r') as f:
            return json.load(f)
    return {"macros": []}

def save_macro_directory(data):
    with open('macro_directory.json', 'w') as f:
        json.dump(data, f, indent=4)

# Function to create a macro file with a given number
def create_macro_file(number, macro_dir):
    filename = f'saved_macros/macro-{number:03d}.py'  # Format number with leading zeros
    current_time = datetime.now().isoformat()
    
    # Create the macro file
    with open(filename, 'w') as f:
        f.write(f'''import pyautogui
import time

# Set a small delay between actions for reliability
pyautogui.PAUSE = 0.5

# Macro {number} template
# Add your automation code here
''')
    
    # Add entry to macro directory
    macro_entry = {
        "name": f"macro-{number:03d}",
        "date_created": current_time,
        "date_modified": current_time,
        "applications_involved": [],
        "active_status": True
    }
    
    macro_dir["macros"].append(macro_entry)
    save_macro_directory(macro_dir)
    return filename

# Load existing macro directory
macro_directory = load_macro_directory()

# Create 10 macro files as an example
for i in range(1, 11):
    filename = create_macro_file(i, macro_directory)
    print(f'Created {filename}')

print('\nMacro files have been generated in the saved_macros directory.')
print('Macro directory has been updated in macro_directory.json') 