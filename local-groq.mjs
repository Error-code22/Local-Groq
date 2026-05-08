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

const messages = [
  { role: 'system', content: 'You are a helpful assistant running in a local CLI.' }
];

console.log('\x1b[32m--- Groq CLI Terminal Started ---\x1b[0m');
console.log('Type "exit" or "quit" to end the session.');

async function chat() {
  while (true) {
    const userInput = await rl.question('\x1b[36mYou: \x1b[0m');

    if (['exit', 'quit'].includes(userInput.toLowerCase().trim())) {
      console.log('\x1b[32mGoodbye!\x1b[0m');
      break;
    }

    if (!userInput.trim()) continue;

    messages.push({ role: 'user', content: userInput });

    try {
      process.stdout.write('\x1b[33mGroq: \x1b[0m');
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
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
