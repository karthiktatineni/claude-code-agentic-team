import { execSync, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { CONFIG } from './config.js';

// Get project directory from args or default to current directory
const BASE_DIR = process.argv[2] ? path.resolve(process.argv[2]) : __dirname;
const TASK_FILE = path.join(BASE_DIR, 'tasks.json');
const MCP_FILE = path.join(BASE_DIR, 'mcp-state.json');

function readMcpState() {
    if (!fs.existsSync(MCP_FILE)) {
        return { messages: [], memory: {}, logs: [], projectState: { phase: 'not-started', status: 'not-started', blockers: [] } };
    }
    try { return JSON.parse(fs.readFileSync(MCP_FILE, 'utf8')); } catch { return { messages: [], memory: {}, logs: [], projectState: { phase: 'not-started', status: 'not-started', blockers: [] } }; }
}

function pushLog(agent, message, type = 'info') {
    const state = readMcpState();
    if (!state.logs) state.logs = [];
    state.logs.push({ agent, message, type, timestamp: new Date().toISOString() });
    // Keep last 200 logs to avoid file bloat
    if (state.logs.length > 200) state.logs = state.logs.slice(-200);
    fs.writeFileSync(MCP_FILE, JSON.stringify(state, null, 2));
}

function updateMcpPhase(phase, status = 'in-progress', metadata = {}) {
    const state = readMcpState();
    state.projectState.phase = phase;
    state.projectState.status = status;
    state.projectState.metadata = { ...(state.projectState.metadata || {}), ...metadata };
    fs.writeFileSync(MCP_FILE, JSON.stringify(state, null, 2));
}

const agents = CONFIG.agents;
const RESET = '\x1b[0m';

function updateTaskPhase(phase) {
    let tasks = { current_phase: "not-started" };
    if (fs.existsSync(TASK_FILE)) {
        try {
            tasks = JSON.parse(fs.readFileSync(TASK_FILE, 'utf8'));
        } catch(e) {}
    }
    tasks.current_phase = phase;
    fs.writeFileSync(TASK_FILE, JSON.stringify(tasks, null, 2));
    updateMcpPhase(phase);
    pushLog('orchestrator', `Phase updated to: ${phase}`, 'phase');
    console.log(`\n==========================================`);
    console.log(`➡️  Phase updated to: ${phase}`);
    console.log(`==========================================\n`);
}

function verifyOutput(expectedPath, agentName) {
    if (!fs.existsSync(expectedPath)) {
        console.error(`\n❌ STRICT ORCHESTRATION FAILED: ${agentName} failed to generate required output.`);
        console.error(`👉 Expected File: ${expectedPath}`);
        console.error(`🔍 Check the logs above to see if the agent skipped output or used the wrong format.`);
        process.exit(1);
    }
    console.log(`✅ Verified: ${agentName} output correctly detected at ${expectedPath}`);
}

function extractAndWriteFiles(outputLines) {
    let filesWritten = 0;
    let currentFile = null;
    let currentContent = [];
    let insideCodeBlock = false;

    // Helper to strip ANSI codes and trim
    const stripAnsi = (str) => str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').trim();

    for (let i = 0; i < outputLines.length; i++) {
        const line = outputLines[i];
        const rawLine = stripAnsi(line);

        // Detect file path wrapped in ** **, ignoring hashes or lists (e.g. "### **src/main.js**", "- **src/main.js**")
        // Require a dot to avoid grabbing random bold text like "**Important**"
        // Detect file path wrapped in ** ** or starting with **
        const fileMatch = rawLine.match(/\*\*([\w\-/]+\.[a-zA-Z0-9]+)\*\*/);
        if (fileMatch && !insideCodeBlock) {
            let extractedFile = fileMatch[1].trim().replace(/\\/g, '/');
            // Remove leading slashes or relative directory dots if any so it writes locally
            extractedFile = extractedFile.replace(/^\/+/, '').replace(/^\.\/+/, '');
            currentFile = extractedFile;
            continue;
        }

        // Detect opening code block: ```lang or ```
        if (currentFile && !insideCodeBlock && rawLine.match(/^```/)) {
            insideCodeBlock = true;
            currentContent = [];
            continue;
        }

        // Detect closing code block
        if (insideCodeBlock && rawLine.match(/^```/)) {
            insideCodeBlock = false;
            // Write file to disk
            try {
                const filePath = path.join(BASE_DIR, currentFile);
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(filePath, currentContent.join('\n'), 'utf8');
                console.log(`\x1b[32m  📄 Wrote: ${currentFile} (${currentContent.length} lines)\x1b[0m`);
                pushLog('file-writer', `Wrote ${currentFile} (${currentContent.length} lines)`, 'success');
                filesWritten++;
            } catch (err) {
                console.error(`\x1b[31m  Failed to write ${currentFile}: ${err.message}\x1b[0m`);
            }
            
            currentFile = null;
            currentContent = [];
            continue;
        }

        // Accumulate content inside code block
        if (insideCodeBlock) {
            // Keep the original line (so we don't accidentally strip things the code needs, though stripping ansi might be safe, we'll strip ANSI here just in case)
            currentContent.push(stripAnsi(line));
        }
    }

    // Auto-flush if agent finished without closing blocks
    if (insideCodeBlock && currentFile && currentContent.length > 0) {
        const filePath = path.join(BASE_DIR, currentFile);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, currentContent.join('\n'), 'utf8');
        filesWritten++;
    }

    return filesWritten;
}

async function runAgent(agentKey, retryCount = 0) {
    const agent = agents[agentKey];
    
    // Determine active model based on retry count
    let activeModel = agent.model;
    if (retryCount > 0 && agent.fallbacks && agent.fallbacks.length > 0) {
        const fallbackIdx = Math.min(retryCount - 1, agent.fallbacks.length - 1);
        activeModel = agent.fallbacks[fallbackIdx];
        console.log(`\n\x1b[33m🔄 [FAILOVER] ${agent.name} is switching to fallback model: ${activeModel}\x1b[0m`);
        pushLog(agent.name, `Switching to fallback model: ${activeModel}`, 'warning');
    }

    console.log(`\x1b[1mLaunching [${agent.name}] using ${activeModel}...\x1b[0m`);
    pushLog(agent.name, `Agent launched with ${activeModel}`, 'start');

    const outputBuffer = [];

    // Prepare context: Instructions + Current State
    const instructionPath = path.join(__dirname, 'agents', agent.file);
    let instructions = fs.readFileSync(instructionPath, 'utf8');

    // --- SKILL INJECTION ---
    const AGENTS_MAPPING_FILE = path.join(BASE_DIR, '.agents');
    if (fs.existsSync(AGENTS_MAPPING_FILE)) {
        try {
            const mapping = JSON.parse(fs.readFileSync(AGENTS_MAPPING_FILE, 'utf8'));
            const agentSkills = mapping[agentKey]?.skills || [];
            if (agentSkills.length > 0) {
                console.log(`\x1b[36m  🧠 Loading ${agentSkills.length} skills for ${agent.name}...\x1b[0m`);
                let skillsContent = '\n\n### AGENT SKILLS & SPECIALIZED KNOWLEDGE\nYou have special training in the following areas. Follow these guidelines strictly:\n';
                
                for (const skillName of agentSkills) {
                    const skillPath = path.join(BASE_DIR, 'skills for agents', 'skills', skillName);
                    if (fs.existsSync(skillPath)) {
                        // Priority: AGENTS.md > SKILL.md > README.md
                        let foundSkillFile = null;
                        for (const fileName of ['AGENTS.md', 'SKILL.md', 'README.md']) {
                            const fullPath = path.join(skillPath, fileName);
                            if (fs.existsSync(fullPath)) {
                                foundSkillFile = fullPath;
                                break;
                            }
                        }

                        if (foundSkillFile) {
                            const content = fs.readFileSync(foundSkillFile, 'utf8');
                            skillsContent += `\n#### SKILL: ${skillName.toUpperCase()}\n${content}\n---\n`;
                        }
                    }
                }
                instructions = instructions + skillsContent;
            }
        } catch (e) {
            console.warn(`⚠️ Failed to parse .agents mapping: ${e.message}`);
        }
    }
    // -----------------------

    const state = readMcpState();
    
    // Create a memory context to help the agent resume work
    const context = `
### PROJECT MEMORY & STATE
You are resuming work. Use the following state to understand what has already been accomplished:
- Current Phase: ${state.projectState.phase}
- Memory: ${JSON.stringify(state.memory || {})}
- Previous Logs: (last 20 logs for context)
${state.logs ? state.logs.slice(-20).map(l => `[${l.agent}] ${l.message}`).join('\n') : 'No previous logs.'}

### INSTRUCTIONS
${instructions}
`;

    const tempPromptPath = path.join(BASE_DIR, `.temp_${agentKey}_prompt.md`);
    fs.writeFileSync(tempPromptPath, context);

    return new Promise((resolve, reject) => {
        const child = exec(
            `type "${tempPromptPath}" | ollama launch claude --model ${activeModel} -y -- --dangerously-skip-permissions`,
            { cwd: BASE_DIR, env: process.env, maxBuffer: 50 * 1024 * 1024 }
        );

        // Cleanup temp file on child exit
        const cleanup = () => { if (fs.existsSync(tempPromptPath)) fs.unlinkSync(tempPromptPath); };
        child.on('exit', cleanup);
        child.on('error', cleanup);

        let stdoutPart = '';
        child.stdout.on('data', (data) => {
            stdoutPart += data.toString();
            let lines = stdoutPart.split(/\r?\n/);
            stdoutPart = lines.pop(); // Keep partial line
            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine) {
                    console.log(`${agent.color}[${agent.name}]${RESET} ${trimmedLine}`);
                    pushLog(agent.name, trimmedLine, 'output');
                    outputBuffer.push(trimmedLine);
                }
            });
        });

        let stderrPart = '';
        child.stderr.on('data', (data) => {
            stderrPart += data.toString();
            let lines = stderrPart.split(/\r?\n/);
            stderrPart = lines.pop(); // Keep partial line
            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine) {
                    console.log(`${agent.color}[${agent.name} LOG]${RESET} ${trimmedLine}`);
                    pushLog(agent.name, trimmedLine, 'stderr');
                }
            });
        });

        child.on('close', async (code) => {
            if (stdoutPart.trim()) {
                outputBuffer.push(stdoutPart.trim());
                pushLog(agent.name, stdoutPart.trim(), 'output');
            }
            if (stderrPart.trim()) {
                pushLog(agent.name, stderrPart.trim(), 'stderr');
            }
            
            // Extract and write any files from stdout FIRST so retries have latest context
            if (outputBuffer.length > 0) {
                const count = extractAndWriteFiles(outputBuffer);
                if (count > 0) {
                    console.log(`\n\x1b[36m  📦 File Extractor: Wrote ${count} file(s) from ${agent.name} output.\x1b[0m\n`);
                    pushLog('file-writer', `Extracted ${count} files from ${agent.name}`, 'success');
                }
            }

            if (code !== 0) {
                const maxRetries = (agent.fallbacks ? agent.fallbacks.length : 0) + 1;
                if (retryCount < maxRetries) {
                    const waitTime = 2000; // Shorter wait since we are changing models
                    console.log(`\n⚠️  [${agent.name}] failed with code ${code}. Retrying with next model in ${waitTime/1000}s... (Attempt ${retryCount + 2}/${maxRetries + 1})`);
                    pushLog(agent.name, `Failed with code ${code}. Retrying with fallback...`, 'error');
                    setTimeout(() => {
                        resolve(runAgent(agentKey, retryCount + 1));
                    }, waitTime);
                } else {
                    console.error(`\n❌ Pipeline Aborted: ${agent.name} failed after all fallback attempts.`);
                    pushLog(agent.name, `Final failure with code ${code}`, 'error');
                    process.exit(1);
                }
                return;
            }

            console.log(`${agent.color}[${agent.name}] exited successfully.${RESET}`);
            resolve();
        });
    });
}

async function main() {
    console.log("⚙️ Starting AI Dev Team Server & Orchestrator...\n");

    try {
        // 0. Research Phase
        const researchPath = path.join(BASE_DIR, 'research.md');
        if (!fs.existsSync(researchPath)) {
            updateTaskPhase("technical-research");
            await runAgent("researcher");
        } else {
            console.log("⏩ Skipping Research (research.md already exists)");
        }
        verifyOutput(researchPath, "Researcher Agent");

        // 1. PRD Phase
        const prdPath = path.join(BASE_DIR, 'prd.md');
        if (!fs.existsSync(prdPath)) {
            updateTaskPhase("prd-generation");
            await runAgent("prd");
        } else {
            console.log("⏩ Skipping PRD generation (prd.md already exists)");
        }
        verifyOutput(prdPath, "PRD Agent");

        // 1.5 Architecture Phase
        const architecturePath = path.join(BASE_DIR, 'architecture.md');
        if (!fs.existsSync(architecturePath)) {
            updateTaskPhase("architecture-design");
            await runAgent("architect");
        } else {
            console.log("⏩ Skipping Architecture (architecture.md already exists)");
        }
        verifyOutput(architecturePath, "Architect Agent");

        // 2 & 3. CODER ↔ REVIEWER FEEDBACK LOOP
        const stateObj = readMcpState();
        const MAX_REVIEW_ITERATIONS = CONFIG.loop.max_review_iterations;
        let reviewPassed = stateObj.projectState.status === 'completed' && stateObj.projectState.phase.includes('review');
        let startIteration = stateObj.projectState.metadata?.iteration || 1;

        for (let iteration = startIteration; iteration <= MAX_REVIEW_ITERATIONS; iteration++) {
            if (reviewPassed) break;
            updateMcpPhase(`coding (iteration ${iteration})`, 'in-progress', { iteration });
            console.log(`\n🔄 ===== CODER ↔ REVIEWER LOOP — Iteration ${iteration}/${MAX_REVIEW_ITERATIONS} =====\n`);

            // Coding Phase
            updateTaskPhase(`coding (iteration ${iteration})`);
            await runAgent("coder");
            // Validation: Coder must at least output something in src/
            verifyOutput(path.join(BASE_DIR, 'src'), "Coding Agent");

            // Review Phase
            updateTaskPhase(`review (iteration ${iteration})`);
            await runAgent("reviewer");
            // Validation: Reviewer must output review.md in the reviews folder
            verifyOutput(path.join(BASE_DIR, 'reviews', 'review.md'), "Review Agent");

            // Parse review result
            const reviewFile = path.join(BASE_DIR, 'reviews', 'review.md');
            if (fs.existsSync(reviewFile)) {
                const reviewContent = fs.readFileSync(reviewFile, 'utf8');

                if (reviewContent.includes('[STATUS: PASSED]')) {
                    console.log(`\n✅✅✅ CODE REVIEW PASSED on iteration ${iteration}! Moving to next phase. ✅✅✅\n`);
                    reviewPassed = true;
                    break;
                } else if (reviewContent.includes('[STATUS: FAILED]')) {
                    console.log(`\n⚠️  CODE REVIEW FAILED on iteration ${iteration}. Sending feedback back to Coder...`);
                    if (iteration < MAX_REVIEW_ITERATIONS) {
                        console.log(`↩️  Looping back to Coder Agent with review feedback.\n`);
                    }
                } else {
                    console.log(`\n⚠️  Review did not contain a status tag. Assuming PASSED.\n`);
                    reviewPassed = true;
                    break;
                }
            } else {
                console.log(`\n⚠️  No review.md found. Skipping loop.\n`);
                break;
            }
        }

        if (!reviewPassed) {
            console.log(`\n🛑 Code did not pass review after ${MAX_REVIEW_ITERATIONS} iterations. Proceeding with best effort.\n`);
        }

        // 3.5 Testing Phase
        const testsPath = path.join(BASE_DIR, 'tests');
        if (!fs.existsSync(testsPath)) {
            updateTaskPhase("automated-testing");
            await runAgent("tester");
        } else {
            console.log("⏩ Skipping Testing (tests/ already exists)");
        }
        verifyOutput(testsPath, "Tester Agent");

        // 4. UI/Design Phase (DEPENDS ON SRC/PRD)
        const uiPath = path.join(BASE_DIR, 'design');
        if (!fs.existsSync(uiPath)) {
            updateTaskPhase("ui-design");
            await runAgent("ui");
        } else {
            console.log("⏩ Skipping UI/Design (design/ already exists)");
        }
        verifyOutput(uiPath, "UI/Brand Agent");

        // 5. Security Phase
        const securityPath = path.join(BASE_DIR, 'security');
        if (!fs.existsSync(securityPath)) {
            updateTaskPhase("security-audit");
            await runAgent("security");
        } else {
            console.log("⏩ Skipping Security Audit (security/ already exists)");
        }
        verifyOutput(securityPath, "Security Agent");

        // 6. Production / Live Deployment Phase
        const prodPath = path.join(BASE_DIR, 'production');
        if (!fs.existsSync(prodPath)) {
            updateTaskPhase("production-deployment");
            await runAgent("production");
        } else {
            console.log("⏩ Skipping Production Deployment (production/ already exists)");
        }

        // 7. Documentation Phase
        updateTaskPhase("documentation-generation");
        await runAgent("documentation");
        
        updateTaskPhase("completed");
        console.log("🎉 All AI team members have finished their sequential tasks perfectly. Project is stable!");
        
    } catch (err) {
        console.error("Pipeline Aborted due to failure:", err.message);
        process.exit(1);
    }
}

main();
