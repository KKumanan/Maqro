import json
import yaml
import time
import requests
from uagents import Agent, Context, Protocol
from uagents.setup import fund_agent_if_low

def load_config():
    with open('config.yaml', 'r') as f:
        return yaml.safe_load(f)

config = load_config()
TRAINER_SEED = config['trainer']['seed']
TRAINER_PORT = config['trainer']['port']
EXECUTOR_PORT = config['executor']['port']
ASI1_API_KEY = config['asi1']['api_key']
WORKFLOW_PATH = config['paths']['workflow']

trainer = Agent(
    name="macro_trainer",
    port=TRAINER_PORT,
    seed=TRAINER_SEED,
)

@trainer.on_event("startup")
async def startup(ctx: Context):
    fund_agent_if_low(ctx.wallet.address())

def call_asi1_mini(prompt):
    headers = {
        "Authorization": f"Bearer {ASI1_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "asi-1-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            print(f"Attempting to connect to ASI-1 API (attempt {retry_count + 1}/{max_retries})...")
            response = requests.post(
                "https://api.asi-1.ai/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content']
            else:
                print(f"Error response from ASI-1: {response.text}")
                if response.status_code == 401:
                    print("Authentication error: Please check your API key")
                    raise Exception("Invalid API key")
                elif response.status_code == 404:
                    print("API endpoint not found: Please check the API URL")
                    raise Exception("Invalid API endpoint")
                else:
                    raise Exception(f"ASI-1 API error: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"Network error: {str(e)}")
            if retry_count < max_retries - 1:
                print("Retrying in 2 seconds...")
                time.sleep(2)
            retry_count += 1
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            raise
    
    raise Exception("Failed to connect to ASI-1 API after multiple attempts")

def refine_macro(macro):
    print("\nWhat improvements would you like to make to this macro?")
    print("You can describe your desired changes in natural language.")
    print("For example: 'Add a delay between steps' or 'Make the typing faster'")
    user_input = input("\nYour refinement request: ")
    
    prompt = f"""I have a macro that I want to improve. Here's the current macro:
{json.dumps(macro, indent=2)}

The user wants to: {user_input}

Please help me refine this macro. Return ONLY the JSON of the refined macro, maintaining the same structure but with your improvements.
Make sure to:
1. Keep the same basic structure (id and steps array)
2. Only modify the steps that need improvement
3. Return valid JSON that can be parsed directly
4. Do not include any explanatory text, just the JSON

Here's the refined macro:"""
    
    try:
        refined_json = call_asi1_mini(prompt)
        # Try to extract JSON from the response
        try:
            # First try direct JSON parsing
            return json.loads(refined_json)
        except json.JSONDecodeError:
            # If that fails, try to find JSON in the text
            import re
            json_match = re.search(r'\{.*\}', refined_json, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    print("Found JSON-like text but it's not valid JSON. Using original macro.")
                    return macro
            else:
                print("Could not find valid JSON in the response. Using original macro.")
                return macro
    except Exception as e:
        print(f"Error during refinement: {str(e)}")
        print("Using original macro.")
        return macro

def send_to_executor(macro):
    max_retries = 3
    retry_count = 0
    last_error = None
    
    while retry_count < max_retries:
        try:
            print(f"Attempting to connect to executor (attempt {retry_count + 1}/{max_retries})...")
            response = requests.post(
                f"http://127.0.0.1:{EXECUTOR_PORT}/macro",
                json=macro,
                timeout=10
            )
            return response.json()
        except requests.exceptions.ConnectionError as e:
            last_error = e
            print(f"Connection failed (attempt {retry_count + 1}/{max_retries}): {str(e)}")
            if retry_count < max_retries - 1:
                print("Retrying in 2 seconds...")
                time.sleep(2)
            retry_count += 1
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    print(f"Failed to connect to executor after {max_retries} attempts")
    return {"status": "error", "message": f"Could not connect to executor: {str(last_error)}"}

def main():
    # Load workflow
    try:
        with open(WORKFLOW_PATH, 'r') as f:
            workflow = json.load(f)
    except Exception as e:
        print(f"Error loading workflow: {str(e)}")
        return
    
    print("\nProposed macro:")
    print(json.dumps(workflow, indent=2))
    
    while True:
        choice = input("\n[a]ccept or [r]efine? ").lower()
        
        if choice == 'a':
            print("\nSending to executor...")
            result = send_to_executor(workflow)
            print(f"Result: {result}")
            if result.get('status') == 'error':
                print("Would you like to try again? [y/n]")
                if input().lower() != 'y':
                    break
            else:
                break
        elif choice == 'r':
            print("\nRefining macro...")
            try:
                workflow = refine_macro(workflow)
                print("\nRefined macro:")
                print(json.dumps(workflow, indent=2))
            except Exception as e:
                print(f"Error during refinement: {str(e)}")
                print("Would you like to try again? [y/n]")
                if input().lower() != 'y':
                    break
        else:
            print("Invalid choice. Please enter 'a' or 'r'.")

if __name__ == "__main__":
    main() 