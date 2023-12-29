// 启动koa服务
const Server = require("./Server/index");
new Server();

// 打开后台
const { BACK_ADMIN_DOMAIN } = require("./Config/index");
switch (process.platform) {
    case "darwin": //unix 系统内核
        require("child_process").exec(`open ${BACK_ADMIN_DOMAIN}/manage/`);
        break;
    case "win32": //windows 系统内核
        require("child_process").exec(`start ${BACK_ADMIN_DOMAIN}/manage/`);
        break;
}