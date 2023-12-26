const ip = require('ip');
const os = require('os');

const PLATFORM_ENUN = {
  Boss: 'Boss',
  Zhilian: 'zhilian',
  Linkedin: 'Linkedin',
  maimai: 'maimai'
}

const JOB_PRIORITY_ENUM = {
  GREET: 1,
  CHAT: 2,
  RECALL: 3
}

const ENV_ENUM = {
  PROD: 'PROD',
  BETA: 'BETA',
  DEV: 'DEV',
  LOCAL: 'LOCAL'
}
let ENV;

switch (process.env.NODE_ENV) {
  case 'production':
    ENV = ENV_ENUM.PROD;
    break;
  case 'beta':
    ENV = ENV_ENUM.BETA;
    break;
  case 'dev':
    ENV = ENV_ENUM.DEV;
    break;
  case 'local':
    ENV = ENV_ENUM.LOCAL;
    break;
  default:
    ENV = ENV_ENUM.PROD;
    break;
}

const BROADCAST_MESSAGE_TOPIC = `broadcast.topic`;
const SEND_MESSAGE_TOPIC = `send.topic`;

const myIP = ip.address();
const addressName = os.hostname();

const HEALTH_CHECK_STATUS = {
  START: 'START',
  END: 'END',
  PING: 'PING',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  NOT_LOGIN: 'NOT_LOGIN',
  NOT_IN_JOB: 'NOT_IN_JOB',
  NOT_IN_MSG: 'NOT_IN_MSG',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  ERROR_NOTICE: 'ERROR_NOTICE'
}

const LOCAL_STORAGE_CONSTANTS = {
  STORE_PATH: "./local-storage",
  USER_NAME_KEY: "user_name",
} 

module.exports = {
  PLATFORM_ENUN,
  JOB_PRIORITY_ENUM,
  ENV_ENUM,
  ENV,
  BROADCAST_MESSAGE_TOPIC,
  SEND_MESSAGE_TOPIC,
  myIP,
  addressName,
  processId: process.pid,
  HEALTH_CHECK_STATUS,
  LOCAL_STORAGE_CONSTANTS,
  BIZ_DOMAIN: 'http://aistormy.com',
  // BIZ_DOMAIN: 'http://114.248.220.242:32040',
  BACK_ADMIN_DOMAIN: "http://localhost:5173", // 后台域名
}
