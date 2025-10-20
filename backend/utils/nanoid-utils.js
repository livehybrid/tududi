// Utility for handling nanoid imports
let nanoid;

// Try to import nanoid using dynamic import
async function initNanoid() {
    if (!nanoid) {
        try {
            const nanoidModule = await import('nanoid');
            nanoid = nanoidModule.nanoid;
        } catch (error) {
            // Fallback to a simple ID generator if nanoid fails
            nanoid = function(length = 21) {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let result = '';
                for (let i = 0; i < length; i++) {
                    result += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return result;
            };
        }
    }
    return nanoid;
}

// Initialize nanoid immediately
initNanoid();

module.exports = { nanoid: () => nanoid ? nanoid() : initNanoid().then(n => n()) }; 