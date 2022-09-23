const BaseQueue = require('./base_queue');
const LOG = require('./log');
const { getRedisConnection } = require("./redis");

class RedisQueue extends BaseQueue {
  constructor(queueName, checkInterval) {
    super(checkInterval);
    this.queueName = queueName;
  }

  async checkQueue() {
    if (!getRedisConnection()) {
      this.nextCheck();
      return;
    }
    try {
      const items = await getRedisConnection().zrange(this.queueName, 0, 1);
      if (items.length > 0) {
        const item = items[0];
        if (await this.canDequeue(item)) {
          await this.dequeue(item);
        }
      }
    } catch (e) {
      LOG.warn('raise except:', e);
    }
    this.nextCheck();
  }

  async enqueue(key, checkQueueDoneCallback) {
    this.addCallback(key, checkQueueDoneCallback);
    return await getRedisConnection().zadd(this.queueName, Date.now(), key);
  }

  async dequeue(key) {
    this.removeCallback(key);
    return await getRedisConnection().zrem(this.queueName, key);
  }

  async indexOf(key) {
    return await getRedisConnection().zrank(this.queueName, key);
  }

  async count() {
    return await getRedisConnection().zcard(this.queueName);
  }
}

module.exports = RedisQueue;
