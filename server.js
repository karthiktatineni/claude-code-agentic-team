import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const agents = [
    { name: 'PRD', file: 'prd-agent.md', color: '\x1b[36m' }, // Cyan
    { name: 'CODER', file: 'coder-agent.md', color: '\x1b[32m' }, // Green
    { name: 'REVIEWER', file: 'reviewer-agent.md', color: '\x1b[33m' }, // Yellow
    { name: 'UI', file: 'ui-agent.md', color: '\x1b[35m' }, // Magenta
    { name: 'SECURITY', file: 'security-agent.md', color: '\x1b[31m' }, // Red
];

const RESET = '\x1b[0m';

console.log("==========================================");
console.log("   AI Dev Team Server Display (Logs)");
console.log("==========================================\n");

// Ensure directories
['src', 'reviews', 'design', 'security', 'logs'].forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
});

agents.forEach(agent => {
    console.log(`${agent.color}Starting [${agent.name}] Agent...${RESET}`);
    
    // Pass the --yes flag to the wrapper, and --dangerously-skip-permissions to Claude Code
    const child = exec(
        `type "agents\\${agent.file}" | ollama launch claude --model gpt-oss:120b-cloud -y -- --dangerously-skip-permissions`,
        {
            cwd: __dirname,
            env: process.env
        }
    );

    child.stdout.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
            if (line) console.log(`${agent.color}[${agent.name}]${RESET} ${line}`);
        });
    });

    child.stderr.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
            if (line) console.error(`${agent.color}[${agent.name} ERR]${RESET} ${line}`);
        });
    });

    child.on('close', (code) => {
        console.log(`${agent.color}[${agent.name}] Agent exited with code ${code}${RESET}`);
    });
});

console.log("\nAll 5 agents are now running in the background.");
console.log("Streaming logs to server display...\n");
