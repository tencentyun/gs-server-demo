const express = require('express');
const router = express.Router();

const {
  tryLock,
  stopGame,
  createSession } = require('../cloud_rendering_lib/gs');
const {
  AppErrorMsg,
  QueueState,
  getClientIp,
  validString,
  validSchema,
  simpleRespone,
  onMissParams } = require('../cloud_rendering_lib/com');
const { verifySign } = require('../cloud_rendering_lib/sign');
const { Config, DefaultKeys } = require('../cloud_rendering_lib/config');
const RequestConstraint = require('../cloud_rendering_lib/constraint');
const MemQueue = require('../cloud_rendering_lib/mem_queue');
const LOG = require('../cloud_rendering_lib/log');

let apiParamsSchema = {};
const waitQueue = {};
const enqueueTimeout = 30000;   // ms
const queueCheckInterval = 1000; // ms
const noIdleMsg = 'ResourceNotFound.NoIdle';
const queue = new MemQueue(queueCheckInterval);

if (Config.configs[DefaultKeys.API_SIGN] == 'Y') {
  apiParamsSchema = {
    '/StartGame': {
      ClientSession: validSchema(validString, true),
      UserId: validSchema(validString, true),
      GameId: validSchema(validString, true),
      RequestId: validSchema(validString, true),
      Sign: validSchema(validString, true),
    },
    '/StopGame': {
      UserId: validSchema(validString, true),
      RequestId: validSchema(validString, true),
      Sign: validSchema(validString, true),
    },
    '/Enqueue': {
      UserId: validSchema(validString, true),
      GameId: validSchema(validString, true),
      RequestId: validSchema(validString, true),
      Sign: validSchema(validString, true),
    },
    '/Dequeue': {
      UserId: validSchema(validString, true),
      RequestId: validSchema(validString, true),
      Sign: validSchema(validString, true),
    },
    onFailed: onMissParams
  };
} else {
  apiParamsSchema = {
    '/StartGame': {
      ClientSession: validSchema(validString, true),
      UserId: validSchema(validString, true),
      GameId: validSchema(validString, true),
      RequestId: validSchema(validString, true),
    },
    '/StopGame': {
      UserId: validSchema(validString, true),
      RequestId: validSchema(validString, true),
    },
    '/Enqueue': {
      UserId: validSchema(validString, true),
      GameId: validSchema(validString, true),
      RequestId: validSchema(validString, true),
    },
    '/Dequeue': {
      UserId: validSchema(validString, true),
      RequestId: validSchema(validString, true),
    },
    onFailed: onMissParams
  };
}

const verifyReqParams = RequestConstraint.prototype.verify.bind(new RequestConstraint(apiParamsSchema));

router.post('/StartGame', verifyReqParams, verifySign, async (req, res, next) => {
  const params = req.body;

  try {
    const userIp = getClientIp(req);

    // 尝试锁定机器，详细接口说明参照（https://cloud.tencent.com/document/product/1162/40738）
    let ret = await tryLock({
      UserId: params.UserId,
      GameId: params.GameId,
      UserIp: userIp,
      GroupId: params.GroupId
    });
    if (ret.Code != 0) {
      simpleRespone(req, res, ret);
      return;
    }

    // 创建会话，详细接口说明参照（https://cloud.tencent.com/document/product/1162/40740）
    ret = await createSession({
      UserId: params.UserId,
      GameId: params.GameId,
      ClientSession: params.ClientSession,
      Resolution: params.Resolution,
      GameParas: params.GameParas,
      ImageUrl: params.ImageUrl,
      Bitrate: params.Bitrate,
      MaxBitrate: params.MaxBitrate,
      MinBitrate: params.MinBitrate,
      Fps: params.Fps,
      GameRegion: params.GameRegion,
      SetNo: params.SetNo,
      Optimization: params.Optimization,
      UserIp: userIp,
      HostUserId: params.HostUserId,
      Role: params.Role,
      GameContext: params.GameContext,
      RunMode: params.RunMode,
    });

    simpleRespone(req, res, ret);
  } catch (e) {
    LOG.error(req.path, 'raise except:', e);
    simpleRespone(req, res, e);
  }
});

router.post('/StopGame', verifyReqParams, verifySign, async (req, res, next) => {
  const params = req.body;
  const userId = params.UserId;

  try {
    // 强制退出游戏，详细接口说明参照（https://cloud.tencent.com/document/product/1162/40739）
    ret = await stopGame({
      UserId: userId
    });

    simpleRespone(req, res, ret);
  } catch (e) {
    LOG.error(req.path, 'raise except:', e);
    simpleRespone(req, res, ret);
  }
});

const doCheckQueue = async key => {
  do {
    try {
      const item = waitQueue[key];
      if ((Date.now() - item.TimeStamp) > enqueueTimeout) {
        LOG.debug(`${item.UserId} enqueue timeout`);
        break;
      }

      const params = {
        GameId: item.GameId,
        UserId: item.UserId,
        UserIp: item.UserIp,
        GroupId: item.GroupId
      };
      waitQueue[key].State = QueueState.Locking;
      const ret = await tryLock(params);
      LOG.debug(`${item.UserId} ready to play, tryLock ret:`, ret);
    } catch (e) {
      if (e.Error && e.Error.code === noIdleMsg) {
        if (waitQueue[key]) {
          waitQueue[key].State = QueueState.Wait;
          LOG.debug(`${waitQueue[key].UserId} reset to wait`);
        }
        return false;
      }
      LOG.debug(`${waitQueue[key].UserId} reject error: ${e.Error.code}, remove from queue`);
    }
  } while (0);
  delete waitQueue[key];
  return true;
};

router.post('/Enqueue', verifyReqParams, verifySign, async (req, res, next) => {
  const Params = req.body;
  const UserId = Params.UserId;
  const GameId = Params.GameId;
  const GroupId = Params.GroupId;
  const UserIp = getClientIp(req);

  const response = (item, index) => {
    let ret = AppErrorMsg.Queuing;
    if (item.State === QueueState.Done) {
      ret = AppErrorMsg.QueueDone;
      LOG.debug(`${item.UserId} queue done`);
    }
    res.json({
      RequestId: Params.RequestId,
      Data: {
        Index: index,
        UserId: item.UserId,
        GameId: item.GameId
      }, ...ret
    });
    return LOG.debug(ret.Msg);
  };

  if (waitQueue[UserId]) {
    waitQueue[UserId].TimeStamp = Date.now();
    waitQueue[UserId].GameId = GameId;
    waitQueue[UserId].GroupId = GroupId;
    LOG.debug(`${UserId} update timestamp`);
    return response(waitQueue[UserId], queue.indexOf(UserId));
  }

  const newUser = {
    UserId,
    GameId,
    UserIp,
    GroupId,
    TimeStamp: Date.now(),
    State: QueueState.Wait,
  };
  try {
    await tryLock({ UserId: UserId, GameId: GameId, UserIp: UserIp, GroupId: GroupId });
    newUser.State = QueueState.Done;
    newUser.TimeStamp = Date.now();
    LOG.debug(`${UserId} ready to play`);
    return response(newUser, 0);
  } catch (e) {
    LOG.error(req.path, 'imediately trylock raise except:', e);
  }

  newUser.TimeStamp = Date.now();
  queue.enqueue(UserId, doCheckQueue);
  waitQueue[UserId] = newUser;
  LOG.debug(`new user ${UserId} queuing`);

  return response(newUser, queue.indexOf(UserId));
});

router.post('/Dequeue', verifyReqParams, verifySign, async (req, res, next) => {
  const Params = req.body;
  const UserId = Params.UserId;

  queue.dequeue(UserId);
  delete waitQueue[UserId];
  LOG.debug(`${UserId} dequeue`);
  res.json({ RequestId: Params.RequestId, ...AppErrorMsg.Ok });
});

Config.registerModule(__filename, {
  router
});
