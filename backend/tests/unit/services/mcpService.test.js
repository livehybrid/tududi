const mcpService = require('../../../services/mcpService');
const EventEmitter = require('events');

function createMockRes() {
    const res = new EventEmitter();
    res.writeHead = jest.fn();
    res.write = jest.fn();
    res.end = jest.fn(() => {
        res.finished = true;
        res.emit('close');
    });
    res.flushHeaders = jest.fn();
    return res;
}

describe('MCP Service', () => {
    afterEach(() => {
        mcpService.removeAllClients(1);
    });

    it('should add client and send messages', () => {
        const res = createMockRes();
        mcpService.addClient(1, res);
        expect(res.writeHead).toHaveBeenCalledWith(
            200,
            expect.objectContaining({ 'Content-Type': 'text/event-stream' })
        );
        expect(mcpService._getClientCount(1)).toBe(1);

        mcpService.send(1, { hello: 'world' });
        expect(res.write).toHaveBeenCalledWith(
            expect.stringContaining('hello')
        );

        res.end();
        expect(mcpService._getClientCount(1)).toBe(0);
    });
});
