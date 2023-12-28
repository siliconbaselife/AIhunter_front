const Koa = require("koa");
const useMiddleware = require("./Middleware/index");
const useRoute = require("./Controller/index");

const { PROCESS_CONSTANTS } = require("../Config/index");

class AppServer {
    app = new Koa();
    port = PROCESS_CONSTANTS.MAIN_KOA_LISTEN_PORT;

    constructor() {
        this.setApp();
        this.app.listen(this.port, "0.0.0.0", this.onAppListened.bind(this));
    }

    setApp() {
        useMiddleware(this.app); // 加载前置中间件
        useRoute(this.app); // 加载路由
    }

    onAppListened() {
        console.log(`服务已启动，进程ID为 ${process.pid}，端口号为 ${this.port}`);
    }
}

new AppServer();

module.exports = AppServer;