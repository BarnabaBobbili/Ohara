const MAX_QUEUE_SIZE = Number.parseInt(process.env.LOG_QUEUE_MAX_SIZE || '5000', 10);
const CONCURRENCY = Number.parseInt(process.env.LOG_QUEUE_CONCURRENCY || '2', 10);
const RETRY_LIMIT = Number.parseInt(process.env.LOG_QUEUE_RETRY_LIMIT || '2', 10);
const RETRY_DELAY_MS = Number.parseInt(process.env.LOG_QUEUE_RETRY_DELAY_MS || '200', 10);

const queue = [];
let activeWorkers = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runQueue = () => {
    while (activeWorkers < CONCURRENCY && queue.length > 0) {
        const job = queue.shift();
        activeWorkers += 1;

        Promise.resolve()
            .then(() => job.run())
            .catch(async (error) => {
                if (job.attempt < RETRY_LIMIT) {
                    job.attempt += 1;
                    await sleep(RETRY_DELAY_MS * job.attempt);
                    queue.push(job);
                    return;
                }
                console.warn(`Dropped log job "${job.name}" after retries:`, error.message);
            })
            .finally(() => {
                activeWorkers -= 1;
                setImmediate(runQueue);
            });
    }
};

export const enqueueLogJob = (name, run) => {
    if (typeof run !== 'function') {
        return false;
    }

    if (queue.length >= MAX_QUEUE_SIZE) {
        console.warn(`Dropped log job "${name}" because queue is full`);
        return false;
    }

    queue.push({
        name,
        run,
        attempt: 1,
    });

    setImmediate(runQueue);
    return true;
};

export const getLogQueueStats = () => ({
    pending: queue.length,
    activeWorkers,
    concurrency: CONCURRENCY,
});
