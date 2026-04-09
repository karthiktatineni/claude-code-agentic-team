import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'mcp-state.json');

// Helper to reliably read/write shared state across stdio processes
function readState() {
  if (!fs.existsSync(DB_FILE)) {
    return { messages: [], memory: {}, projectState: { phase: "prd-generation", status: "not-started", blockers: [] } };
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeState(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const server = new Server(
  {
    name: "ai-team-comm-bridge",
    version: "1.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools for the agents to communicate
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "post_message",
        description: "Send a message to another agent (e.g. from Coder to Reviewer). Use 'all' as target to broadcast.",
        inputSchema: {
          type: "object",
          properties: {
            to: { type: "string", description: "Target agent (e.g., prd, coder, reviewer, ui, security, all)" },
            from: { type: "string", description: "Your own agent name" },
            message: { type: "string", description: "Message content" },
          },
          required: ["to", "from", "message"],
        },
      },
      {
        name: "read_messages",
        description: "Read all messages addressed to your agent or broadcasted to 'all'.",
        inputSchema: {
          type: "object",
          properties: {
            agent: { type: "string", description: "Your agent name to fetch messages for." },
          },
          required: ["agent"],
        },
      },
      {
        name: "update_project_phase",
        description: "Update the overall project phase when you have completed your job.",
        inputSchema: {
          type: "object",
          properties: {
            phase: { type: "string", description: "New project phase (e.g., coding, reviewing, ui-design)" },
            status: { type: "string", description: "Status: in-progress, blocked, completed" },
            blockers: { type: "array", items: { type: "string" }, description: "Any blockers preventing progress" },
          },
          required: ["phase", "status"],
        },
      },
      {
        name: "get_project_state",
        description: "Get the current project status and phase to see if it is your turn to work.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "store_memory",
        description: "Store an important memory mapping or context about the project so agents don't forget.",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string" },
            value: { type: "string" }
          },
          required: ["key", "value"],
        },
      },
      {
        name: "read_memory",
        description: "Read project memory mappings.",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "Optional key to read specific memory. Leave empty for all." }
          },
        },
      }
    ],
  };
});

// Handle tool executions
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const state = readState();

  try {
    if (name === "post_message") {
      state.messages.push({
        to: args.to,
        from: args.from,
        message: args.message,
        timestamp: new Date().toISOString(),
      });
      writeState(state);
      return { content: [{ type: "text", text: `Message successfully posted to ${args.to}.` }] };
    }

    if (name === "read_messages") {
      const agentMessages = state.messages.filter(m => m.to === args.agent || m.to === "all");
      return { 
        content: [{ 
          type: "text", 
          text: agentMessages.length > 0 
            ? JSON.stringify(agentMessages, null, 2) 
            : "No messages found." 
        }] 
      };
    }

    if (name === "update_project_phase") {
      state.projectState.phase = args.phase;
      state.projectState.status = args.status;
      if (args.blockers) state.projectState.blockers = args.blockers;
      
      writeState(state);
      return { content: [{ type: "text", text: `Project phase updated to ${args.phase} (${args.status}).` }] };
    }

    if (name === "get_project_state") {
      return { content: [{ type: "text", text: JSON.stringify(state.projectState, null, 2) }] };
    }

    if (name === "store_memory") {
      if (!state.memory) state.memory = {};
      state.memory[args.key] = args.value;
      writeState(state);
      return { content: [{ type: "text", text: `Memory mapped successfully for key: ${args.key}` }] };
    }

    if (name === "read_memory") {
      if (!state.memory) return { content: [{ type: "text", text: "No memories stored yet." }] };
      const output = args.key ? state.memory[args.key] : state.memory;
      return { content: [{ type: "text", text: JSON.stringify(output || "Key not found", null, 2) }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
