# Groq CLI

A lightweight, streaming CLI interface for interacting with Groq's Llama-3 models.

## Features

- **Real-time Streaming:** See responses as they are generated.
- **Persistent Context:** Remembers the conversation during the session.
- **Easy Setup:** Use a `.env` file for API key management.
- **Windows Friendly:** Includes a `.cmd` wrapper for easy launching.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A Groq API Key (get one at [console.groq.com](https://console.groq.com/keys))

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/local-groq.git
   cd local-groq
   ```

2. **Configure your API Key:**
   - Create a file named `.env` in the root directory.
   - Copy the contents of `.env.example` into `.env`.
   - Replace `your_key_here` with your actual Groq API key.

   ```text
   GROQ_API_KEY=gsk_...
   ```

## Usage

### Windows
Double-click `local-groq.cmd` or run:
```bash
.\local-groq.cmd
```

### Linux / macOS
```bash
chmod +x local-groq.mjs
node local-groq.mjs
```

## License
MIT
