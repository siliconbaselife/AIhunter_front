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

// 本地储存配置
const LOCAL_STORAGE_CONSTANTS = {
  STORE_PATH: "./local-storage",
  USER_INFO_KEY: "user_info",
  ACCOUNT_INFO_KEY: "account_info",
}

// 进程配置
const PROCESS_CONSTANTS = {
  MAIN_KOA_LISTEN_PORT: 4000, // 主进程Koa监听端口;
  ACCOUNT_REGISTER_EVENT_TYPE: "ACCOUNT_REGISTER", // 绑定账号事件类型
  ACCOUNT_EXECUTE_EVENT_TYPE: "ACCOUNT_EXECUTE", // 执行账号任务事件类型
  PROCESS_NORMAL_CLOASE_SINGAL: "SIGTERM", // 表明子进程是正常关闭的信号
}

module.exports = {
  PLATFORM_ENUN,
  JOB_PRIORITY_ENUM,
  BROADCAST_MESSAGE_TOPIC,
  SEND_MESSAGE_TOPIC,
  HEALTH_CHECK_STATUS,
  LOCAL_STORAGE_CONSTANTS,
  PROCESS_CONSTANTS,
  BIZ_DOMAIN: 'http://aistormy.com',
  // BIZ_DOMAIN: 'http://114.248.220.242:32040',
  // BACK_ADMIN_DOMAIN: "http://localhost:5173", // 后台zh域名
  BACK_ADMIN_DOMAIN: "http://www.shadowhiring.cn", // 后台zh域名
}
