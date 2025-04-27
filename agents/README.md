# Workflow Habit Optimizer

A desktop agent that captures app usage patterns, suggests macros, and executes them automatically.

## System Architecture

The system consists of the following components:

1. **Tracker Service**
   - Captures app usage, clicks, keystrokes into json files
   - Views 10000 actions at a time in a sliding window

2. **ML Pattern Miner**
   - Analyzes sessions to find repeated workflows

3. **Macro Trainer Agent**
   - Receives detected workflows
   - Suggests macros to user
   - Lets user accept or refine via natural language
   - Calls ASI-1 Mini for macro refinement
   - After user confirmation, sends final macro to Executor Agent

4. **Macro Executor Agent**
   - Receives macro steps
   - Opens apps, websites, simulates actions using pyautogui/os.system

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/workflow-habit-optimizer.git
cd workflow-habit-optimizer
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
# Required: ASI-1 Mini API key
export ASI1_API_KEY="your_api_key_here"
```

## Usage

### Quick Start

The easiest way to start the system is to use the `start_agents.py` script:

```bash
python agent/start_agents.py
```

This will start all agents in the correct order:
1. Macro Trainer Agent (port 8001)
2. Macro Executor Agent (port 8002)
3. Test Workflow (port 8003)

### Manual Start

If you need to start agents individually:

1. Start the Macro Trainer Agent:
```bash
python agent/macro_trainer_agent.py
```

2. Start the Macro Executor Agent:
```bash
python agent/macro_executor_agent.py
```

3. Run the test workflow:
```bash
python agent/test_workflow.py
```

### Testing the System

The test workflow demonstrates the following process:

1. A pattern is submitted to the Macro Trainer Agent
2. The Macro Trainer Agent analyzes the pattern and suggests a macro
3. The user accepts the macro suggestion
4. The Macro Trainer Agent sends the macro to the Macro Executor Agent
5. The Macro Executor Agent executes the macro steps

## Supported Actions

The system supports the following actions:

1. **Keyboard Actions**
   - Single key presses
   - Keyboard shortcuts (e.g., command+l)
   - Text typing

2. **Mouse Actions**
   - Clicks at specific coordinates

3. **App Actions**
   - Launching applications
   - Opening websites

## Supported Applications

The system supports the following applications:

- Visual Studio Code
- Slack
- Google Chrome
- Safari
- Terminal
- Finder
- Notes
- Calendar
- Mail
- Messages
- Photos
- Music
- Preview
- Calculator
- System Settings

## Supported Websites

The system supports the following websites:

- GitHub
- Notion
- Gmail
- Google Calendar
- Google Drive
- Google Docs
- Google Sheets
- Google Slides
- YouTube
- LinkedIn
- Twitter
- Facebook
- Instagram

## License

MIT

---

## Technologies Used

- **Fetch.ai uAgents**
- **Fetch.ai ASI-1 Mini LLM API**
- **Python (Flask for optional local API trigger)**
- **SQLite (for local event storage)**
- **PyAutoGUI / OS commands** (for app automation)

---

## How It Works

1. **Tracking**: 
   - User behavior (apps opened, actions taken) is logged locally into an events database.

2. **Pattern Mining**: 
   - When repeated workflows are detected (e.g., "VS Code → GitHub → Slack"), the Macro Trainer Agent suggests automating them.

3. **User Refinement**:
   - User can accept the macro or refine it naturally (e.g., "add Notion after GitHub").
   - **ASI-1 Mini** processes this instruction and outputs a clean, structured workflow.

4. **Macro Saving**:
   - Refined macros are stored in a local `final_macro.json` file.

5. **Macro Execution**:
   - The Macro Executor Agent reads the macro steps.
   - Opens apps, websites, sends notifications, and automates tasks accordingly.

---

## Demo Instructions

- Start **Macro Trainer Agent**:
  ```bash
  python agent/macro_trainer_agent.py
