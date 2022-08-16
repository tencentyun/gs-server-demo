const proc = require('process');

const LOG = require('./log');
const { AppErrorMsg } = require('./com');
const newGsClient = require('./gs_client');

const deleteUselessParams = reqParams => {
  delete reqParams['Sign'];
  delete reqParams['RequestId'];
};

const tryLock = (params) => {
  return new Promise((resolve, reject) => {
    const reqParams = { ...params };
    deleteUselessParams(reqParams);
    const begin = proc.uptime();
    newGsClient().TrylockWorker(reqParams).then((res) => {
      const elapsed = Math.round((proc.uptime() - begin) * 1000);
      LOG.debug('TrylockWorker res:', res, elapsed, 'ms');
      resolve(AppErrorMsg.Ok);
    }, (err) => {
      LOG.debug('TrylockWorker error:', err);
      reject({ Error: err, ...AppErrorMsg.LockFailed });
    }).catch((e) => {
      LOG.debug('TrylockWorker except:', e);
      reject({ Error: err, ...AppErrorMsg.LockFailed });
    });
  });
};

const createSession = (params) => {
  return new Promise((resolve, reject) => {
    const reqParams = { ...params };
    deleteUselessParams(reqParams);
    const begin = proc.uptime();
    newGsClient().CreateSession(reqParams).then((res) => {
      const elapsed = Math.round((proc.uptime() - begin) * 1000);
      LOG.debug('CreateSession res:', res, elapsed, 'ms');
      resolve({ SessionDescribe: res, ...AppErrorMsg.Ok });
    }, (err) => {
      LOG.debug('CreateSession error:', err);
      reject(AppErrorMsg.CreateFailed);
    }).catch((e) => {
      LOG.debug('CreateSession except:', e);
      reject(AppErrorMsg.CreateFailed);
    });
  });
};

const stopGame = (params) => {
  return new Promise((resolve, reject) => {
    const reqParams = { ...params };
    deleteUselessParams(reqParams);
    const begin = proc.uptime();
    newGsClient().StopGame(reqParams).then((res) => {
      const elapsed = Math.round((proc.uptime() - begin) * 1000);
      LOG.debug('StopGame res:', res, elapsed, 'ms');
      resolve(AppErrorMsg.Ok);
    }, (err) => {
      LOG.debug('StopGame error:', err);
      reject(AppErrorMsg.StopFailed);
    }).catch((e) => {
      LOG.debug('StopGame except:', e);
      reject(AppErrorMsg.StopFailed);
    });
  });
};

module.exports = {
  tryLock,
  createSession,
  stopGame,
};
