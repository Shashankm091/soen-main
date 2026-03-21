const memoryBlacklist = new Map();

const redisClient = {
    async get(key) {
        return memoryBlacklist.get(key) ?? null;
    },
    async set(key, value, mode, seconds) {
        memoryBlacklist.set(key, value);
        if (mode === 'EX' && Number.isFinite(Number(seconds)) && Number(seconds) > 0) {
            setTimeout(() => memoryBlacklist.delete(key), Number(seconds) * 1000).unref &&
            setTimeout(() => memoryBlacklist.delete(key), Number(seconds) * 1000).unref();
        }
        return 'OK';
    },
    on() { }
};

export default redisClient;