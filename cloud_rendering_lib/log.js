const LOG = {
  trace: (...args) => console.trace(new Date(), '[TRACE]', ...args),
  debug: (...args) => console.debug(new Date(), '[DEBUG]', ...args),
  info: (...args) => console.info(new Date(), '[INFO]', ...args),
  warn: (...args) => console.warn(new Date(), '[WARN]', ...args),
  error: (...args) => console.error(new Date(), '[ERROR]', ...args),
};

module.exports = LOG;
