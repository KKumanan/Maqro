import json
import yaml
import time

def load_config():
    with open('config.yaml', 'r') as f:
        return yaml.safe_load(f)

def write_workflow():
    config = load_config()
    workflow = {
        "id": config['workflow_demo']['id'],
        "steps": config['workflow_demo']['steps']
    }
    
    with open(config['paths']['workflow'], 'w') as f:
        json.dump(workflow, f, indent=2)
    
    print(f"Wrote workflow to {config['paths']['workflow']}")

if __name__ == "__main__":
    write_workflow() 