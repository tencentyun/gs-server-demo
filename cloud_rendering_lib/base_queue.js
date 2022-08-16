const { isPromise, isFunction, isString, isAsyncFunction } = require("./com");
const LOG = require("./log");

class BaseQueue {
  constructor(checkInterval) {
    this.checkInterval = checkInterval;
    this.checkTimer = null;
    this.callbacks = {};
    this.nextCheck();
  }

  nextCheck() {
    if (!this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = null;
    }
    this.checkTimer = setTimeout(this.checkQueue.bind(this), this.checkInterval);
  }

  async canDequeue(key) {
    try {
      if (isString(key)) {
        const cb = this.getCallback(key);
        let ret = false;
        if (!cb) {
          return true;
        } else if (isAsyncFunction(cb) || isPromise(cb)) {
          ret = await cb(key);
          return ret;
        } else if (isFunction(cb)) {
          ret = cb(key);
          return ret;
        } else {
          LOG.error('callback is not callable');
        }
      }
    } catch (e) {
      LOG.error(`raise except: ${e}`);
      return true;
    }
    return false;
  }

  checkQueue() {
    LOG.warn('BaseQueue');
  }

  addCallback(key, cb) {
    this.callbacks[key] = cb;
  }

  removeCallback(key) {
    delete this.callbacks[key];
  }

  getCallback(key) {
    return this.callbacks[key];
  }
}

module.exports = BaseQueue;
