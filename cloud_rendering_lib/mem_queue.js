const BaseQueue = require('./base_queue');
const LOG = require('./log');

class MemQueue extends BaseQueue {
  constructor(checkInterval) {
    super(checkInterval);
    this.queue = [];
    this.indexs = {};
  }

  async checkQueue() {
    if (this.count() > 0) {
      const item = this.queue[0];
      if (await this.canDequeue(item)) {
        this.dequeue(item);
      }
    }
    this.nextCheck();
  }

  enqueue(key, checkQueueDoneCallback) {
    const index = this.indexOf(key);
    this.addCallback(key, checkQueueDoneCallback);
    if (index >= 0) {
      return;
    }
    this.queue.push(key);
    this.indexs[key] = this.count() - 1;
  }

  dequeue(key) {
    const index = this.indexOf(key);
    if (index === -1) {
      LOG.error(`invalid key ${key}`);
      return;
    }
    this.queue.splice(index, 1);
    this.removeCallback(key);
    this.reloadIndexs();
  }

  indexOf(key) {
    return this.indexs[key];
  }

  reloadIndexs() {
    this.indexs = {};
    this.queue.forEach((item, index) => {
      this.indexs[item] = index;
    });
  }

  count() {
    return this.queue.length;
  }

  getKeyByIndex(index) {
    return index < this.queue.length ? this.queue[index] : null;
  }
}

module.exports = MemQueue;
