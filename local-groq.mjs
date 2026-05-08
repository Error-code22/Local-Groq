#!/usr/bin/env node

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const messages = [
  { role: 'system', content: 'You are a helpful assistant running in a local CLI.' }
];

console.log('\x1b[32m--- Groq CLI Terminal Started ---\x1b[0m');
console.log('Type \x1b[35m/\x1b[0m for commands, or "exit" to end.');

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
      } else if (cmd === 'clear') {
        messages.splice(1);
        console.log('\x1b[33mChat history cleared.\x1b[0m\n');
        continue;
      } else if (cmd === 'help' || cmd === '') {
        console.log('\n\x1b[35mCommands:\x1b[0m');
        console.log('/model  - List or switch models');
        console.log('/system - View or change assistant persona');
        console.log('/save   - Save chat history to a .md file');
        console.log('/clear  - Clear chat history');
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
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: currentModel,
          messages: messages,
          stream: true
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Unknown error');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;

            try {
              const data = JSON.parse(dataStr);
              const content = data.choices[0]?.delta?.content || '';
              process.stdout.write(content);
              fullContent += content;
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      process.stdout.write('\n');
      messages.push({ role: 'assistant', content: fullContent });

    } catch (error) {
      console.error(`\n\x1b[31mError: ${error.message}\x1b[0m`);
    }
  }
  rl.close();
}

chat();
