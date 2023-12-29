// 启动koa服务
const Server = require("./Server/index");
new Server();

// 打开后台
const { BACK_ADMIN_DOMAIN } = require("./Config/index");
require("child_process").exec(`start ${BACK_ADMIN_DOMAIN}/manage/`);