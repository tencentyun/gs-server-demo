const proc = require('process');
const prompt = require('prompt');
const Redis = require('redis');
const { Config, DefaultKeys } = require('./config');
const { validString } = require('./com');
const LOG = require('./log');

const kRedisQueueEnv = 'REDIS_QUEUE';
const kRedis = 'redis';
const kRedisEnv = 'REDIS';
const kRedisPwd = 'redis_pwd';
const kRedisPwdEnv = 'REDIS_PWD';

Config.registerModule(__filename, {
  loadEnv: _ => {
    const conf = {};
    if (validString(proc.env[kRedisQueueEnv])) {
      conf[DefaultKeys.REDIS_QUEUE] = proc.env[kRedisQueueEnv];
    }
    if (validString(proc.env[kRedisEnv])) {
      conf[kRedis] = proc.env[kRedisEnv];
    }
    if (validString(proc.env[kRedisPwdEnv])) {
      conf[kRedisPwd] = proc.env[kRedisPwdEnv];
    }
    return conf;
  },
  install: async _ => {
    const schema = {
      properties: {
        redis_queue: {
          type: 'string',
          description: '是否开启 redis 队列存储方式（Y/N），不填默认不开启，使用内存队列存储',
          pattern: /^[YN]?$/,
          required: true,
          default: 'N'
        },
      }
    };
    const ret = await prompt.get(schema);
    Config.set(DefaultKeys.REDIS_QUEUE, ret.redis_queue);
    if (Config.configs[DefaultKeys.REDIS_QUEUE] == 'Y') {
      const schema = {
        properties: {
          redis: {
            description: '请输入 redis 服务连接地址',
            required: true,
          },
          redisPwd: {
            description: '请输入 redis 服务密码',
            required: false
          },
        }
      };
      const ret = await prompt.get(schema);
      Config.set(kRedis, ret.redis);
      Config.set(kRedisPwd, ret.redisPwd);
    }
  }
});

class RedisConnection {
  constructor() {
    this.client = Redis.createClient(Config.get(kRedis),
      validString(Config.get(kRedisPwd))
        ? { auth_pass: Config.get(kRedisPwd) } : null);

    const client = this.client;

    this.client.on('ready', _ => {
      LOG.info('redis client ready');
    });

    this.client.on('connect', _ => {
      LOG.info('redis is now connected');
    });

    this.client.on('reconnecting', (info) => {
      LOG.info('redis reconnecting', info);
    });

    this.client.on('end', _ => {
      LOG.info('redis is closed');
    });

    this.client.on('warning', (...args) => {
      LOG.warn('redis client warning', args);
    });

    const onError = (err) => {
      LOG.error('redis raise error', err, this.client.options);
    };

    this.client.on('error', onError.bind(this.client));
  }

  set(key, value, expire) {
    return new Promise((resolve, reject) => {
      this.client.set(key, value, (err, doc) => {
        if (err) {
          reject(err);
          return;
        }
        if (typeof (expire) == 'number' && expire != -1) {
          this.client.expire(key, expire);
        }
        resolve(doc);
      });
    });
  }

  get(key) {
    return new Promise((resolve, reject) =>
      this.client.get(key, (err, ret) => err ? reject(err) : resolve(ret)));
  }

  mget(key, keys) {
    return new Promise((resolve, reject) =>
      this.client.mget(key, keys, (err, ret) => err ? reject(err) : resolve(ret)));
  }

  del(key) {
    return new Promise((resolve, reject) =>
      this.client.del(key, (err, ret) => err ? reject(err) : resolve(ret)));
  }

  zadd(key, score, item) {
    return new Promise((resolve, reject) =>
      this.client.zadd(key, score, item, (err, ret) => err ? reject(err) : resolve(ret)));
  }

  zrank(key, item) {
    return new Promise((resolve, reject) =>
      this.client.zrank(key, item, (err, ret) => err ? reject(err) : resolve(ret)));
  }

  zrem(key, item) {
    return new Promise((resolve, reject) =>
      this.client.zrem(key, item, (err, ret) => err ? reject(err) : resolve(ret)));
  }

  zcard(key) {
    return new Promise((resolve, reject) =>
      this.client.zcard(key, (err, ret) => err ? reject(err) : resolve(ret)));
  }

  zrange(key, start, size) {
    return new Promise((resolve, reject) =>
      this.client.zrange(key, start, size, (err, ret) => err ? reject(err) : resolve(ret)));
  }

  hset(key, field, value) {
    return new Promise((resolve, reject) =>
      this.client.hset(key, field, value, (err, ret) => err ? reject(err) : resolve(ret)));
  }

  hget(key, field) {
    return new Promise((resolve, reject) =>
      this.client.hget(key, field, (err, ret) => err ? reject(err) : resolve(ret)));
  }

  hdel(key, field) {
    return new Promise((resolve, reject) =>
      this.client.hdel(key, field, (err, ret) => err ? reject(err) : resolve(ret)));
  }
};

let redisConnection = null;

module.exports = {
  createRedisConnection: _ => {
    if (!redisConnection) {
      redisConnection = new RedisConnection();
    }
  },
  getRedisConnection: _ => {
    return redisConnection;
  }
};
