const EventEmitter = require('events');

class MCPService extends EventEmitter {
    constructor() {
        super();
        this.clients = new Map(); // userId -> Set of client objects
    }

    addClient(userId, res) {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });
        res.flushHeaders && res.flushHeaders();
        res.write('\n');

        const client = { res };
        client.pingInterval = setInterval(() => {
            res.write('event: ping\n');
            res.write('data: {}\n\n');
        }, 30000);

        if (!this.clients.has(userId)) {
            this.clients.set(userId, new Set());
        }
        this.clients.get(userId).add(client);

        res.on('close', () => {
            this.removeClient(userId, client);
        });
    }

    removeClient(userId, client) {
        if (client.pingInterval) {
            clearInterval(client.pingInterval);
        }
        const set = this.clients.get(userId);
        if (set) {
            set.delete(client);
            if (set.size === 0) {
                this.clients.delete(userId);
            }
        }
    }

    removeAllClients(userId) {
        const set = this.clients.get(userId);
        if (set) {
            for (const client of set) {
                if (client.pingInterval) {
                    clearInterval(client.pingInterval);
                }
                client.res.end();
            }
            this.clients.delete(userId);
        }
    }

    send(userId, message, event = 'message') {
        const set = this.clients.get(userId);
        if (!set) return;
        const data = `event: ${event}\n` + `data: ${JSON.stringify(message)}\n\n`;
        for (const client of set) {
            client.res.write(data);
        }
    }

    _getClientCount(userId) {
        const set = this.clients.get(userId);
        return set ? set.size : 0;
    }
}

module.exports = new MCPService();
