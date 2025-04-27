import json
import requests
from typing import Dict, List, Any

def load_workflow(filepath: str) -> Dict[str, Any]:
    """Load workflow from a JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)

def display_workflow(workflow: Dict[str, Any]) -> None:
    """Display workflow steps in a readable format."""
    print("\nWorkflow Steps:")
    for i, step in enumerate(workflow['steps'], 1):
        app = step['app']
        action = step['action']
        args = step['args']
        
        if action == 'open_file':
            print(f"{i}. Open {app} and open file {args['path']}")
        elif action == 'type':
            print(f"{i}. In {app}, type text: {args['text']}")
        elif action == 'save_file':
            print(f"{i}. Save the file")

def ask_user_acceptance() -> str:
    """Ask user if they want to accept, refine, or reject the workflow."""
    while True:
        choice = input("\nDo you want to (yes/refine/no)? ").lower()
        if choice in ['yes', 'refine', 'no']:
            return choice
        print("Please enter 'yes', 'refine', or 'no'")

def call_asi1_refinement(original_steps: List[Dict[str, Any]], user_instruction: str) -> List[Dict[str, Any]]:
    """Call ASI-1 Mini API to refine workflow steps."""
    api_key = "sk_7ffa5e40c15b48fd9da6173d6c735c0b3eede2f5fa964d2d8a86a6926dc6b92d"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Format the original steps for the prompt
    steps_text = "\n".join([f"{i+1}. {step['app']} {step['action']}: {json.dumps(step['args'])}" 
                           for i, step in enumerate(original_steps)])
    
    prompt = f"""You are refining a workflow that consists of:
{steps_text}

User instruction: {user_instruction}

Return ONLY a JSON array of steps in the following format, with no additional text:
[
  {{
    "app": "Code",
    "action": "open_file",
    "args": {{"path": "filename.swift"}}
  }},
  {{
    "app": "Code",
    "action": "type",
    "args": {{"text": "code here"}}
  }},
  {{
    "app": "Code",
    "action": "save_file",
    "args": {{}}
  }}
]"""

    try:
        response = requests.post(
            "https://api.asi1.ai/v1/chat/completions",
            headers=headers,
            json={
                "model": "asi1-mini",
                "messages": [{"role": "user", "content": prompt}]
            }
        )
        
        if response.status_code != 200:
            print(f"API Response Status: {response.status_code}")
            print(f"API Response Text: {response.text}")
            raise Exception(f"API call failed with status {response.status_code}")
        
        response_data = response.json()
        if 'choices' not in response_data or not response_data['choices']:
            raise Exception("API response missing choices")
            
        content = response_data['choices'][0]['message']['content']
        print(f"\nAPI Response Content: {content}\n")  # Debug print
        
        # Try to extract JSON from the response
        try:
            refined_steps = json.loads(content)
        except json.JSONDecodeError:
            # If direct parsing fails, try to extract JSON from the text
            import re
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                refined_steps = json.loads(json_match.group())
            else:
                raise Exception("Could not find valid JSON in API response")
        
        # Validate the structure of refined steps
        if not isinstance(refined_steps, list):
            raise Exception("Refined steps must be a list")
            
        for step in refined_steps:
            if not all(key in step for key in ['app', 'action', 'args']):
                raise Exception("Each step must have 'app', 'action', and 'args' fields")
        
        return refined_steps
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"Network error: {str(e)}")
    except Exception as e:
        raise Exception(f"Error processing API response: {str(e)}")

def save_final_macro(workflow: Dict[str, Any], status: str) -> None:
    """Save the final workflow to final_macro.json."""
    workflow['status'] = status
    with open('final_macro.json', 'w') as f:
        json.dump(workflow, f, indent=2)

def main():
    try:
        # Load the workflow
        workflow = load_workflow('workflows.json')
        
        # Display the workflow
        display_workflow(workflow)
        
        # Ask for user acceptance
        choice = ask_user_acceptance()
        
        if choice == 'yes':
            save_final_macro(workflow, 'confirmed')
            print("Workflow saved as confirmed.")
            
        elif choice == 'refine':
            user_instruction = input("Enter your refinement instruction: ")
            refined_steps = call_asi1_refinement(workflow['steps'], user_instruction)
            
            # Display refined workflow
            workflow['steps'] = refined_steps
            print("\nRefined Workflow:")
            display_workflow(workflow)
            
            # Ask for final acceptance
            final_choice = input("\nAccept final macro? (yes/no): ").lower()
            if final_choice == 'yes':
                save_final_macro(workflow, 'refined')
                print("Refined workflow saved.")
            else:
                print("Workflow rejected.")
                
        else:  # choice == 'no'
            print("Workflow rejected.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main() 