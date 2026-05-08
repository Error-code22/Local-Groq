#!/usr/bin/env node

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = path.join(__dirname, 'history.json');

// Load .env file manually to avoid dependencies
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const API_KEY = process.env.GROQ_API_KEY;

if (!API_KEY) {
  console.error('\x1b[31mError: GROQ_API_KEY environment variable is not set.\x1b[0m');
  console.log('Please set it using: setx GROQ_API_KEY "your_key_here" (and restart your terminal)');
  process.exit(1);
}

const rl = readline.createInterface({ input, output });

const AVAILABLE_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it'
];

let currentModel = AVAILABLE_MODELS[0];

const DEFAULT_SYSTEM_PROMPT = 'You are a helpful Local CLI Agent with access to the user\'s filesystem. You provide technical assistance and can explore local files to help the user. Use tools whenever you need to see what files are present or read their contents.';

let messages = [
  { role: 'system', content: DEFAULT_SYSTEM_PROMPT }
];

// Load History
if (fs.existsSync(HISTORY_PATH)) {
  try {
    const savedHistory = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    if (Array.isArray(savedHistory)) {
      messages = savedHistory;
    }
  } catch (e) {
    console.log('\x1b[33mWarning: Could not load history.json. Starting fresh.\x1b[0m');
  }
}

function saveHistory() {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(messages, null, 2));
}

// Tool Definitions
const tools = [
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'Lists files and directories in a given path.',
      parameters: {
        type: 'object',
        properties: {
          directory: {
            type: 'string',
            description: 'The directory to list (defaults to current directory ".").'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Reads the contents of a file.',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'The path to the file to read.'
          }
        },
        required: ['file_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_os_info',
      description: 'Gets basic information about the current operating system.',
      parameters: { type: 'object', properties: {} }
    }
  }
];

// Tool Implementation
const toolHandlers = {
  list_files: ({ directory = '.' }) => {
    try {
      const files = fs.readdirSync(directory);
      return JSON.stringify(files);
    } catch (e) {
      return `Error listing files: ${e.message}`;
    }
  },
  read_file: ({ file_path }) => {
    try {
      return fs.readFileSync(file_path, 'utf8');
    } catch (e) {
      return `Error reading file: ${e.message}`;
    }
  },
  get_os_info: () => {
    return JSON.stringify({
      platform: os.platform(),
      release: os.release(),
      type: os.type(),
      arch: os.arch()
    });
  }
};

console.log('\x1b[32m--- Groq CLI Agent Started ---\x1b[0m');
console.log('Type \x1b[35m/\x1b[0m for commands, or "exit" to end.');

async function callGroq(msgs) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: currentModel,
      messages: msgs,
      tools: tools,
      tool_choice: 'auto'
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Unknown error');
  }

  return await response.json();
}

async function chat() {
  while (true) {
    const userInput = await rl.question(`\x1b[34m[${currentModel}]\x1b[0m \x1b[36mYou: \x1b[0m`);
    const trimmedInput = userInput.trim();

    if (['exit', 'quit'].includes(trimmedInput.toLowerCase())) {
      console.log('\x1b[32mGoodbye!\x1b[0m');
      break;
    }

    if (!trimmedInput) continue;

    // Command Handling
    if (trimmedInput.startsWith('/')) {
      const [cmd, ...args] = trimmedInput.slice(1).split(' ');
      
      if (cmd === 'model') {
        if (args.length === 0) {
          console.log('\n\x1b[35mAvailable Models:\x1b[0m');
          AVAILABLE_MODELS.forEach((m, i) => {
            console.log(`${i + 1}. ${m} ${m === currentModel ? '\x1b[32m(current)\x1b[0m' : ''}`);
          });
          console.log('To switch, type: /model <number or name>\n');
        } else {
          const selection = args[0];
          const index = parseInt(selection) - 1;
          if (!isNaN(index) && AVAILABLE_MODELS[index]) {
            currentModel = AVAILABLE_MODELS[index];
            console.log(`\x1b[32mSwitched to: ${currentModel}\x1b[0m\n`);
          } else if (AVAILABLE_MODELS.includes(selection)) {
            currentModel = selection;
            console.log(`\x1b[32mSwitched to: ${currentModel}\x1b[0m\n`);
          } else {
            console.log('\x1b[31mInvalid model selection.\x1b[0m\n');
          }
        }
        continue;
      } else if (cmd === 'system') {
        if (args.length === 0) {
          console.log(`\n\x1b[35mCurrent System Prompt:\x1b[0m ${messages[0].content}`);
          console.log('To change it, type: /system <new prompt>\n');
        } else {
          const newPrompt = args.join(' ');
          messages[0].content = newPrompt;
          saveHistory();
          console.log(`\x1b[32mSystem prompt updated.\x1b[0m\n`);
        }
        continue;
      } else if (cmd === 'save') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `chat-${timestamp}.md`;
        const content = messages.map(m => `### ${m.role.toUpperCase()}\n${m.content}\n`).join('\n');
        fs.writeFileSync(fileName, content);
        console.log(`\x1b[32mChat saved to ${fileName}\x1b[0m\n`);
        continue;
      } else if (cmd === 'clear' || cmd === 'reset') {
        messages = [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }];
        if (fs.existsSync(HISTORY_PATH)) fs.unlinkSync(HISTORY_PATH);
        console.log('\x1b[33mChat memory reset.\x1b[0m\n');
        continue;
      } else if (cmd === 'help' || cmd === '') {
        console.log('\n\x1b[35mCommands:\x1b[0m');
        console.log('/model  - List or switch models');
        console.log('/system - View or change assistant persona');
        console.log('/save   - Save chat history to a .md file');
        console.log('/reset  - Wipe all memory and history');
        console.log('/help   - Show this message');
        console.log('/exit   - Close the application\n');
        continue;
      } else if (cmd === 'exit' || cmd === 'quit') {
        console.log('\x1b[32mGoodbye!\x1b[0m');
        break;
      } else {
        console.log(`\x1b[31mUnknown command: /${cmd}. Type /help for options.\x1b[0m\n`);
        continue;
      }
    }

    messages.push({ role: 'user', content: trimmedInput });

    try {
      process.stdout.write('\x1b[33mGroq: \x1b[0m');
      
      let finalResponse = '';
      let currentCall = await callGroq(messages);

      while (currentCall.choices[0].message.tool_calls) {
        const toolCalls = currentCall.choices[0].message.tool_calls;
        messages.push(currentCall.choices[0].message);

        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          process.stdout.write(`\n\x1b[30;43m Executing ${functionName}... \x1b[0m `);
          
          const result = toolHandlers[functionName](functionArgs);
          
          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: result
          });
        }
        
        currentCall = await callGroq(messages);
      }

      finalResponse = currentCall.choices[0].message.content;
      console.log(finalResponse);
      messages.push({ role: 'assistant', content: finalResponse });
      saveHistory();

    } catch (error) {
      console.error(`\n\x1b[31mError: ${error.message}\x1b[0m`);
    }
  }
  rl.close();
}

chat();
