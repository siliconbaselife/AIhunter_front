// 启动koa服务
const Server = require("./Server/index");
new Server();

// 打开后台
const open = require("open");
const { BACK_ADMIN_DOMAIN } = require("./Config/index");

open(`${BACK_ADMIN_DOMAIN}/manage/`, { newInstance: false });