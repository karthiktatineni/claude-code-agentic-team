export const CONFIG = {
    // Agent Registry
    agents: {
        prd: { 
            name: 'PRD Agent', 
            file: 'prd-agent.md', 
            color: '\x1b[36m', 
            model: 'gpt-oss:120b-cloud',
            fallbacks: ['qwen3-coder:480b-cloud', 'kimi-k2.5:cloud', 'gpt-oss:20b']
        },
        coder: { 
            name: 'Coding Agent', 
            file: 'coder-agent.md', 
            color: '\x1b[32m', 
            model: 'gpt-oss:120b-cloud',
            fallbacks: ['qwen3-coder:480b-cloud', 'kimi-k2.5:cloud', 'gpt-oss:20b']
        },
        reviewer: { 
            name: 'Review Agent', 
            file: 'reviewer-agent.md', 
            color: '\x1b[33m', 
            model: 'gpt-oss:120b-cloud',
            fallbacks: ['qwen3-coder:480b-cloud', 'kimi-k2.5:cloud', 'gpt-oss:20b']
        },
        ui: { 
            name: 'UI/Brand Agent', 
            file: 'ui-agent.md', 
            color: '\x1b[35m', 
            model: 'gpt-oss:120b-cloud',
            fallbacks: ['qwen3-coder:480b-cloud', 'kimi-k2.5:cloud', 'gpt-oss:20b']
        },
        security: { 
            name: 'Security Agent', 
            file: 'security-agent.md', 
            color: '\x1b[31m', 
            model: 'gpt-oss:120b-cloud',
            fallbacks: ['qwen3-coder:480b-cloud', 'kimi-k2.5:cloud', 'gpt-oss:20b']
        },
        production: { 
            name: 'Production Agent', 
            file: 'production-agent.md', 
            color: '\x1b[34m', 
            model: 'gpt-oss:120b-cloud',
            fallbacks: ['qwen3-coder:480b-cloud', 'kimi-k2.5:cloud', 'gpt-oss:20b']
        },
        architect: { 
            name: 'Architect Agent', 
            file: 'architect-agent.md', 
            color: '\x1b[34m', 
            model: 'gpt-oss:120b-cloud',
            fallbacks: ['qwen3-coder:480b-cloud', 'kimi-k2.5:cloud', 'gpt-oss:20b']
        },
        researcher: { 
            name: 'Researcher Agent', 
            file: 'researcher-agent.md', 
            color: '\x1b[32m', 
            model: 'gpt-oss:120b-cloud',
            fallbacks: ['qwen3-coder:480b-cloud', 'kimi-k2.5:cloud', 'gpt-oss:20b']
        },
        tester: { 
            name: 'Tester Agent', 
            file: 'tester-agent.md', 
            color: '\x1b[33m', 
            model: 'gpt-oss:120b-cloud',
            fallbacks: ['qwen3-coder:480b-cloud', 'kimi-k2.5:cloud', 'gpt-oss:20b']
        },
        documentation: { 
            name: 'Documentation Agent', 
            file: 'documentation-agent.md', 
            color: '\x1b[36m', 
            model: 'gpt-oss:120b-cloud',
            fallbacks: ['qwen3-coder:480b-cloud', 'kimi-k2.5:cloud', 'gpt-oss:20b']
        }
    },

    // Orchestration Settings
    loop: {
        max_review_iterations: 3,
        auto_pass_no_status: true
    },

    // UI/Server Settings
    server: {
        port: 3000,
        sync_interval_ms: 2000
    }
};
