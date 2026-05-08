# Groq CLI Agent

A powerful, zero-dependency CLI agent that can interact with your local files and remember your conversations.

## Features

- **File System Awareness:** The AI can list files and read their contents to help you with your code or documents.
- **Persistent Memory:** Automatically saves chat history to `history.json` so you can pick up where you left off.
- **Dynamic Tool Calling:** Uses Groq's function calling to interact with your local environment.
- **Command System:** Rich set of commands for managing models, system prompts, and history.
- **Windows Friendly:** Includes a `.cmd` wrapper for easy launching.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- A Groq API Key (get one at [console.groq.com](https://console.groq.com/keys))

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Error-code22/Local-Groq.git
   cd Local-Groq
   ```

2. **Configure your API Key:**
   - Create a file named `.env`.
   - Add your key: `GROQ_API_KEY=gsk_...`

## Usage

Double-click `local-groq.cmd` or run:
```bash
.\local-groq.cmd
```

### Commands
- `/model` - Switch between Llama-3, Mixtral, etc.
- `/system` - Change the AI's personality/instructions.
- `/save` - Export current chat to a Markdown file.
- `/reset` - Wipe all history and start a fresh session.
- `/help` - Show all commands.

### Agent Capabilities
You can ask the AI things like:
- "What files are in this folder?"
- "Read the content of package.json and explain it."
- "Help me debug the code in local-groq.mjs."

## License
MIT
