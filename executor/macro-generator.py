import os
import json
from datetime import datetime
import openai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def generate_macro_script(summary):
    prompt = "Using PyAutoGUI, create a python script for Mac that" + summary + ". Only return the contents of the script in plaintext - do not include code blocks or anything else."
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates Python automation scripts."},
                {"role": "user", "content": prompt}
            ]
        )
        
        # Extract the generated script
        generated_script = response.choices[0].message.content
        
        # Create saved_macros directory if it doesn't exist
        if not os.path.exists('saved_macros'):
            os.makedirs('saved_macros')
            
        # Generate next macro number
        macro_dir = load_macro_directory()
        next_number = len(macro_dir["macros"]) + 1
        
        # Save the generated script
        filename = f'saved_macros/macro-{next_number:03d}.py'
        with open(filename, 'w') as f:
            f.write(generated_script)
            
        # Update macro directory
        current_time = datetime.now().isoformat()
        macro_entry = {
            "name": f"macro-{next_number:03d}",
            "date_created": current_time,
            "date_modified": current_time,
            "applications_involved": ["Spotify"],
            "active_status": True
        }
        
        macro_dir["macros"].append(macro_entry)
        save_macro_directory(macro_dir)
        
        print(f'Generated macro saved as {filename}')
        print('Macro directory has been updated')
        
    except Exception as e:
        print(f"Error generating macro: {str(e)}")

def load_macro_directory():
    if os.path.exists('macro_directory.json'):
        with open('macro_directory.json', 'r') as f:
            return json.load(f)
    return {"macros": []}

def save_macro_directory(data):
    with open('macro_directory.json', 'w') as f:
        json.dump(data, f, indent=4)

if __name__ == "__main__":
    generate_macro_script("open spotify and searches liked songs") 