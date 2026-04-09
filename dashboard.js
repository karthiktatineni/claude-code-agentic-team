import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECTS_DIR = path.join(__dirname, 'projects');

if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// Check for legacy project and migrate if needed
if (fs.existsSync(path.join(__dirname, 'mcp-state.json')) && !fs.existsSync(path.join(PROJECTS_DIR, 'default'))) {
    fs.mkdirSync(path.join(PROJECTS_DIR, 'default'), { recursive: true });
    try { fs.renameSync(path.join(__dirname, 'mcp-state.json'), path.join(PROJECTS_DIR, 'default', 'mcp-state.json')); } catch(e){}
    try { fs.renameSync(path.join(__dirname, 'idea.md'), path.join(PROJECTS_DIR, 'default', 'idea.md')); } catch(e){}
    try { fs.renameSync(path.join(__dirname, 'tasks.json'), path.join(PROJECTS_DIR, 'default', 'tasks.json')); } catch(e){}
}

const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Team Multi-Project Dashboard</title>
    <style>
        :root {
            --bg-color: #020617;
            --surface-color: #0f172a;
            --primary: #3b82f6;
            --accent: #8b5cf6;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --border: rgba(51, 65, 85, 0.5);
            --success: #10b981;
            --sidebar-width: 280px;
            --glass: rgba(15, 23, 42, 0.6);
            --glass-border: rgba(255, 255, 255, 0.1);
        }

        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            background-image: 
                radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 100% 100%, rgba(139, 92, 246, 0.05) 0%, transparent 50%);
        }
        
        .app-layout {
            display: flex;
            width: 100%;
            height: 100vh;
            overflow: hidden;
        }

        .sidebar {
            width: var(--sidebar-width);
            background: var(--surface-color);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            padding: 2rem 1.5rem;
            height: 100%;
            z-index: 10;
        }

        .sidebar-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 2.5rem;
        }

        .logo-icon {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
        }

        .sidebar h2 {
            font-size: 1.1rem;
            font-weight: 700;
            letter-spacing: -0.02em;
        }

        .new-btn {
            background: linear-gradient(135deg, var(--primary), var(--accent));
            color: white;
            border: none;
            padding: 0.875rem 1rem;
            border-radius: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            margin-bottom: 2rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            width: 100%;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }
        
        .new-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
            filter: brightness(1.1);
        }

        .project-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            overflow-y: auto;
            flex: 1;
        }

        .project-item {
            padding: 0.875rem 1rem;
            border-radius: 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;
            color: var(--text-muted);
            font-weight: 500;
            font-size: 0.9rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid transparent;
        }

        .project-item:hover {
            background: rgba(255, 255, 255, 0.03);
            color: var(--text);
        }

        .project-item.active {
            background: rgba(59, 130, 246, 0.1);
            border-color: rgba(59, 130, 246, 0.3);
            color: var(--primary);
        }

        .main-content {
            flex: 1;
            padding: 2.5rem;
            overflow-y: auto;
            position: relative;
        }

        .container {
            max-width: 1300px;
            margin: 0 auto;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2.5rem;
        }

        h1 {
            font-size: 1.75rem;
            font-weight: 800;
            letter-spacing: -0.03em;
            background: linear-gradient(to right, #fff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .status-badge {
            background: rgba(16, 185, 129, 0.05);
            color: var(--success);
            padding: 0.5rem 1.25rem;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border: 1px solid rgba(16, 185, 129, 0.2);
            backdrop-filter: blur(4px);
        }

        .grid {
            display: grid;
            grid-template-columns: 420px 1fr;
            gap: 2rem;
        }

        .card {
            background: var(--glass);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 1.25rem;
            padding: 1.75rem;
            box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
            transition: transform 0.3s ease;
        }

        h2 {
            font-size: 1.1rem;
            margin-bottom: 1.5rem;
            color: var(--text);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 700;
        }

        .phase-display {
            font-size: 1.25rem;
            font-weight: 700;
            color: #fff;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 0.5rem;
            background: linear-gradient(to right, var(--primary), var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .input-group {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
            margin-bottom: 2rem;
        }

        textarea {
            width: 100%;
            height: 140px;
            background: rgba(2, 6, 23, 0.6);
            border: 1px solid var(--border);
            color: var(--text);
            padding: 1.25rem;
            border-radius: 1rem;
            font-size: 0.95rem;
            resize: none;
            transition: all 0.3s ease;
            line-height: 1.5;
        }

        textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
            background: rgba(2, 6, 23, 0.8);
        }

        button.action-btn {
            background: linear-gradient(135deg, var(--primary), var(--accent));
            color: white;
            border: none;
            padding: 1rem;
            border-radius: 0.875rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1rem;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
        }

        button.action-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
        }

        button.action-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            filter: grayscale(0.5);
        }

        .status-display {
            color: var(--text-muted);
            font-size: 0.85rem;
            margin-bottom: 2rem;
            font-family: 'JetBrains Mono', monospace;
        }

        .log-container {
            display: flex;
            flex-direction: column;
            flex: 1;
            background: #020617;
            border-radius: 1rem;
            border: 1px solid var(--border);
            overflow: hidden;
            box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
        }

        .log-header {
            background: #1e293b;
            padding: 0.75rem 1.25rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border);
        }

        .log-dots {
            display: flex;
            gap: 6px;
        }

        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .dot.red { background: #ef4444; }
        .dot.yellow { background: #f59e0b; }
        .dot.green { background: #10b981; }

        .message-list {
            flex: 1;
            padding: 1.25rem;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
        }

        pre {
            background: rgba(2, 6, 23, 0.8);
            padding: 1.25rem;
            border-radius: 0.75rem;
            overflow-x: auto;
            border: 1px solid var(--border);
            color: #94a3b8;
            font-size: 0.8rem;
            margin-top: 1rem;
            font-family: 'JetBrains Mono', monospace;
            max-height: 250px;
        }

        .empty-state {
            text-align: center;
            color: var(--text-muted);
            padding: 4rem 2rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
        }

        .empty-state svg {
            width: 48px;
            height: 48px;
            opacity: 0.2;
        }

        .fullscreen-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 60vh;
            text-align: center;
        }
        
        .fullscreen-empty h2 {
            font-size: 2.5rem;
            letter-spacing: -0.04em;
            margin-bottom: 1rem;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .log-entry {
            padding: 0.6rem 0.75rem;
            border-radius: 0.375rem;
            animation: fadeIn 0.3s ease-out;
            line-height: 1.5;
            word-break: break-all;
        }

        .log-entry:hover {
            background: rgba(255, 255, 255, 0.03);
        }

        .log-time { color: #475569; font-size: 0.75rem; margin-right: 0.75rem; }
        .log-agent { font-weight: 600; color: var(--primary); margin-right: 0.75rem; min-width: 80px; display: inline-block; }
        
        .log-badge {
            display: inline-block; font-size: 0.65rem; padding: 0.15rem 0.5rem;
            border-radius: 4px; text-transform: uppercase; font-weight: 800; margin-right: 0.75rem;
            vertical-align: middle;
        }

        .log-entry.phase { background: rgba(139, 92, 246, 0.1); border-left: 3px solid var(--accent); }
        .log-entry.error { background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; }
        
        .log-badge.phase { background: var(--accent); color: white; }
        .log-badge.start { background: var(--primary); color: white; }
        .log-badge.output { background: #334155; color: #94a3b8; }
        .log-badge.success { background: var(--success); color: white; }
        .log-badge.error { background: #ef4444; color: white; }
    </style>
</head>
<body>
    <div class="app-layout">
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="logo-icon">🚀</div>
                <h2>AI Team Suite</h2>
            </div>
            <button class="new-btn" onclick="createNewProject()">+ Create Project</button>
            <div class="project-list" id="project-list-container">
                <!-- Projects will be listed here -->
            </div>
        </aside>

        <main class="main-content">
            <div class="container">
                <header>
                    <h1 id="header-title">Orchestration Control</h1>
                    <div class="status-badge" id="sync-status">Select Project</div>
                </header>

                <div id="no-project-view" class="fullscreen-empty">
                    <div style="font-size: 4rem; margin-bottom: 2rem;">🏗️</div>
                    <h2>Welcome, Architect</h2>
                    <p style="color: var(--text-muted); max-width: 460px; line-height: 1.6;">Initialize a new project to deploy your specialized AI development team. They will handle PRD, Coding, Review, and Security autonomously.</p>
                </div>

                <div class="grid" id="project-view" style="display: none;">
                    <div style="display: flex; flex-direction: column; gap: 2rem;">
                        <div class="card">
                            <div class="input-group">
                                <h2>Project Idea <span id="current-project-id" style="color:var(--text-muted);font-size:0.8rem;margin-left:auto;font-family:monospace;"></span></h2>
                                <textarea id="idea-input" placeholder="Define your project vision... (e.g. A stock portfolio tracker with real-time news aggregation)"></textarea>
                                <button id="start-btn" class="action-btn" onclick="startOrchestrator()">Initialize Sequences</button>
                            </div>

                            <h2 style="margin-top: 1rem;">Live Pipeline</h2>
                            <div class="phase-display" id="current-phase">Standby</div>
                            <div class="status-display" id="current-status">System ready for input</div>
                        </div>

                        <div class="card">
                            <h2>Telemetry</h2>
                            <pre id="raw-state">Waiting for state...</pre>
                        </div>
                    </div>

                    <div class="card" style="display: flex; flex-direction: column; min-height: 600px;">
                        <h2>Agent Intelligence Feed</h2>
                        <div class="log-container">
                            <div class="log-header">
                                <div class="log-dots">
                                    <div class="dot red"></div>
                                    <div class="dot yellow"></div>
                                    <div class="dot green"></div>
                                </div>
                                <div style="font-size: 0.75rem; color: #64748b; font-family: 'JetBrains Mono';">TEAM_STREAMS_V1.0.4</div>
                            </div>
                            <div class="message-list" id="log-list">
                                <div class="empty-state">
                                    <div style="font-size: 2rem; opacity: 0.5;">📡</div>
                                    <p>Awaiting agent transmission...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script>
        let currentProjectId = null;
        let pollInterval = null;

        function formatTime(isoString) {
            try {
                const date = new Date(isoString);
                if(isNaN(date.getTime())) return "";
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            } catch(e){ return ""; }
        }

        async function fetchProjects() {
            try {
                const res = await fetch('/api/projects');
                const projects = await res.json();
                const container = document.getElementById('project-list-container');
                container.innerHTML = '';
                
                projects.forEach(p => {
                    const div = document.createElement('div');
                    div.className = 'project-item' + (currentProjectId === p.id ? ' active' : '');
                    div.innerHTML = \`<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="\${p.id}">\${p.id}</span>\`;
                    div.onclick = () => selectProject(p.id);
                    container.appendChild(div);
                });
            } catch(e) {
                console.error("Failed to fetch projects", e);
            }
        }

        async function createNewProject() {
            try {
                const title = prompt("Enter a simple name for this project (letters, numbers, hyphens):");
                if (!title) return;
                
                const res = await fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: title.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase() })
                });
                const data = await res.json();
                fetchProjects();
                selectProject(data.id);
            } catch(e) {
                console.error("Failed to create project", e);
            }
        }

        function selectProject(id) {
            currentProjectId = id;
            document.getElementById('no-project-view').style.display = 'none';
            document.getElementById('project-view').style.display = 'grid';
            document.getElementById('current-project-id').textContent = "(" + id + ")";
            document.getElementById('sync-status').textContent = "Syncing " + id;
            document.getElementById('header-title').textContent = "Dashboard: " + id;
            
            fetchProjects(); // update sidebar active states
            
            // clear contents
            document.getElementById('idea-input').value = "";
            document.getElementById('raw-state').textContent = "Loading...";
            document.getElementById('log-list').innerHTML = '<div class="empty-state">Loading state...</div>';
            
            document.getElementById('start-btn').textContent = 'Start Dev Team Execution';
            document.getElementById('start-btn').disabled = false;

            if(pollInterval) clearInterval(pollInterval);
            fetchState();
            pollInterval = setInterval(fetchState, ${CONFIG.server.sync_interval_ms});
        }

        async function fetchState() {
            if (!currentProjectId) return;
            try {
                const res = await fetch('/api/state?id=' + encodeURIComponent(currentProjectId));
                if (!res.ok) return;
                const data = await res.json();
                
                if (data.idea && document.getElementById('idea-input').value === '') {
                    document.getElementById('idea-input').value = data.idea;
                }

                if (data.projectState) {
                    document.getElementById('current-phase').textContent = data.projectState.phase.replace(/-/g, ' ');
                    document.getElementById('current-status').textContent = 'Status: ' + data.projectState.status;
                    document.getElementById('raw-state').textContent = JSON.stringify(data.projectState, null, 2);
                } else {
                    document.getElementById('current-phase').textContent = "Not Started";
                    document.getElementById('current-status').textContent = "Status: Idle";
                    document.getElementById('raw-state').textContent = "No project state saved yet.";
                }

                const messageList = document.getElementById('log-list');
                if (data.logs && data.logs.length > 0) {
                    messageList.innerHTML = data.logs.map(l =>
                        \`<div class="log-entry \${l.type || ''}">
                            <span class="log-time">\${formatTime(l.timestamp)}</span>
                            <span class="log-badge \${l.type || ''}">\${l.type || 'info'}</span>
                            <span class="log-agent">\${l.agent}</span>
                            <span class="log-msg">\${l.message}</span>
                        </div>\`
                    ).join('');
                    
                    // Simple auto-scroll
                    if (messageList.scrollHeight - messageList.scrollTop < messageList.clientHeight + 200) {
                        messageList.scrollTop = messageList.scrollHeight;
                    }
                } else {
                    messageList.innerHTML = \`
                        <div class="empty-state">
                            <div style="font-size: 2rem; opacity: 0.5;">📡</div>
                            <p>Awaiting agent transmission...</p>
                        </div>\`;
                }

            } catch (e) {
                console.error("Failed to fetch state for project", e);
            }
        }

        async function startOrchestrator() {
            if (!currentProjectId) return alert("Select a project first");
            const idea = document.getElementById('idea-input').value;
            if (!idea.trim()) return alert('Please enter an idea first!');
            
            const btn = document.getElementById('start-btn');
            btn.textContent = 'Launching Sequence...';
            btn.disabled = true;

            try {
                await fetch('/api/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idea, projectId: currentProjectId })
                });
                btn.textContent = 'Orchestrator Active';
            } catch(e) {
                btn.textContent = 'Failed';
                console.error(e);
                btn.disabled = false;
            }
        }

        // Initialize display
        fetchProjects();
    </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
    try {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        
        if (urlObj.pathname === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(HTML_CONTENT);
        } else if (urlObj.pathname === '/api/projects') {
            if (req.method === 'GET') {
                const dirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => {
                        const stat = fs.statSync(path.join(PROJECTS_DIR, dirent.name));
                        return { id: dirent.name, mtime: stat.mtimeMs };
                    })
                    .sort((a, b) => b.mtime - a.mtime);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(dirs));
            } else if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk.toString());
                req.on('end', () => {
                    const parsed = JSON.parse(body);
                    const title = parsed.title || 'project';
                    const id = title + '_' + Math.random().toString(36).substr(2, 4);
                    fs.mkdirSync(path.join(PROJECTS_DIR, id), { recursive: true });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ id }));
                });
            }
        } else if (urlObj.pathname === '/api/state') {
            const id = urlObj.searchParams.get('id');
            if (!id) {
                res.writeHead(400); res.end('Missing id'); return;
            }
            const dbFile = path.join(PROJECTS_DIR, id, 'mcp-state.json');
            const ideaFile = path.join(PROJECTS_DIR, id, 'idea.md');
            
            let data = { logs: [], projectState: null, idea: '' };
            if (fs.existsSync(dbFile)) {
                try {
                    const parsed = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
                    data.logs = parsed.logs || [];
                    data.projectState = parsed.projectState;
                } catch(e) {}
            }
            if (fs.existsSync(ideaFile)) {
                data.idea = fs.readFileSync(ideaFile, 'utf8');
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            
        } else if (urlObj.pathname === '/api/start' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                const { idea, projectId } = JSON.parse(body);
                if (!projectId) { res.writeHead(400); res.end(); return; }
                
                const projFolder = path.join(PROJECTS_DIR, projectId);
                if (!fs.existsSync(projFolder)) fs.mkdirSync(projFolder, { recursive: true });
                
                fs.writeFileSync(path.join(projFolder, 'idea.md'), idea);
                
                import('child_process').then(({ exec }) => {
                    exec(`start "Orchestrator ${projectId}" cmd.exe /k "node orchestrator.js \"${projFolder}\""`, {
                        cwd: __dirname
                    });
                });
                
                res.writeHead(200);
                res.end(JSON.stringify({ status: 'ok' }));
            });
        } else {
            res.writeHead(404);
            res.end();
        }
    } catch(err) {
        console.error("Server error:", err);
        if (!res.headersSent) {
            res.writeHead(500);
            res.end();
        }
    }
});

const PORT = CONFIG.server.port;
server.listen(PORT, () => {
    console.log("==========================================");
    console.log(`🌐 Multi-Project UI Dashboard running at http://localhost:${PORT}`);
    console.log("==========================================");
});
