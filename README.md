# 🤖 AI Agentic Team: Autonomous Software Development 🚀

Welcome to the **Claude Code Agentic Team**, a fully autonomous, multi-agent development pipeline designed to take a simple idea and turn it into production-ready software. This project uses the **Model Context Protocol (MCP)** to allow a specialized team of AI agents to communicate, share memory, and collaborate on complex codebase builds.

---

## 🌟 Key Features

- **Autonomous Pipeline**: Seamless progression from Research to Production without manual intervention.
- **Specialized Roles**: 10+ AI agents with distinct responsibilities (Researcher, Architect, Coder, Security, etc.).
- **Dynamic Skill Injection**: Agents pull specialized knowledge (e.g., React best practices, TDD) dynamically from a shared `skills` library.
- **MCP Communication Bridge**: Agents pass messages, store project memory, and update status via a central MCP server.
- **Real-time Dashboard**: Monitor every thought, log, and file change through a beautiful web-based interface.
- **Stable Failover Logic**: Automatic retry and model-switching (Ollama/Claude) to ensure pipeline stability.

---

## 🏗️ The AI Team

| Role | Responsibility | Key Skills Used |
| :--- | :--- | :--- |
| **Researcher** | Gathers best practices & tech docs | Context Optimization, Brainstorming |
| **PRD Agent** | Defines requirements & features | Writing Plans, PRD Generation |
| **Architect** | Designs the codebase structure | Composition Patterns, Tool Design |
| **Coding Agent** | Writes production-ready code | React Best Practices, TDD |
| **Review Agent** | Audits code for bugs & quality | Advanced Evaluation, Debugging |
| **Tester Agent** | Builds unit/integration tests | WebApp Testing, Verification |
| **UI/UX Agent** | Policies & Refines the interface | UI-UX Pro Max, Theme Factory |
| **Security Agent** | Hunts for vulnerabilities | Systematic Debugging |
| **Documentation** | Generates READMEs & API docs | Doc Co-authoring, Writing Skills |
| **Production** | Handles final deployment tasks | Git Worktrees, Finishing Branches |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **Ollama** (with `ollama launch` capability or equivalent)
- **Git** (for version control integration)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/karthiktatineni/claude-code-agentic-team.git
   cd claude-code-agentic-team
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Team

To launch the full system (MCP Server + Dashboards), simply run the provided batch file:

```powershell
.\run.bat
```

Once the services are active, you can start the autonomous orchestration by running:

```powershell
node orchestrator.js
```

The system will:
1. Initialize the **Research Phase**.
2. Generate a **PRD**.
3. Create the **Architecture**.
4. Enter the **Coder-Reviewer Loop** (it will keep refining until the code passes!).
5. Run **Tests**, **Security Audits**, and generate **Documentation**.

---

## 📊 Dashboard

Access the real-time development monitor at **`http://localhost:3000`**. 
Here you can see:
- Phase-by-phase progress.
- Live logs from every agent.
- Shared project memory mapping.
- Current file extraction status.

---

## ⚙️ Configuration

You can customize models, colors, and pipeline behavior in `config.js`. 
Agent-to-Skill mappings are managed in the `.agents` JSON file in the project root.

---


