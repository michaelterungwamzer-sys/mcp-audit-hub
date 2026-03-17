import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({
    name: 'clean-server',
    version: '1.0.0',
});

server.tool('hello', 'Says hello to the user', {
    type: 'object',
    properties: {
        name: { type: 'string', description: 'Name to greet' },
    },
    required: ['name'],
}, async ({ name }: { name: string }) => {
    return { content: [{ type: 'text', text: `Hello, ${name}!` }] };
});
