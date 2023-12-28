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

const BROADCAST_MESSAGE_TOPIC = `broadcast.topic`;
const SEND_MESSAGE_TOPIC = `send.topic`;

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
  USER_INFO_KEY: "user_info",
} 

module.exports = {
  PLATFORM_ENUN,
  JOB_PRIORITY_ENUM,
  BROADCAST_MESSAGE_TOPIC,
  SEND_MESSAGE_TOPIC,
  HEALTH_CHECK_STATUS,
  LOCAL_STORAGE_CONSTANTS,
  BIZ_DOMAIN: 'http://aistormy.com',
  // BIZ_DOMAIN: 'http://114.248.220.242:32040',
  BACK_ADMIN_DOMAIN: "http://localhost:5173", // 后台域名
  MAIN_PROCESS_PORT: 4000, // 主进程端口(子进程会在此端口上逐步递增+1);
}
