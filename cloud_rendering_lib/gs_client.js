const tencentcloud = require('tencentcloud-sdk-nodejs');
const GsClient = tencentcloud.gs.v20191118.Client;

const { Config, DefaultKeys } = require('./config');

const newGsClient = _ => new GsClient({
  credential: {
    secretId: Config.get(DefaultKeys.SECRET_ID),
    secretKey: Config.get(DefaultKeys.SECRET_KEY),
  },
  // cloud api region, for example: ap-guangzhou, ap-beijing, ap-shanghai
  region: Config.get(DefaultKeys.API_REGION),
  profile: {
    signMethod: "TC3-HMAC-SHA256",
    httpProfile: {
      reqMethod: "POST",
      reqTimeout: 30,
    },
  },
});

module.exports = newGsClient;
