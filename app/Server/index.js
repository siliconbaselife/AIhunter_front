const Koa = require("koa");
const useMiddleware = require("./Middleware/index");
const useRoute = require("./Controller/index");

class AppServer {
    app = new Koa();
    port = 4000;

    constructor() {
        this.setApp();
        this.app.listen(this.port, "0.0.0.0", this.onAppListened);
    }

    setApp() {
        useMiddleware(this.app); // 加载前置中间件
        useRoute(this.app); // 加载路由
    }

    onAppListened() {
        console.log(`服务已启动，进程ID为 ${process.pid}`);
    }
}

new AppServer()

module.exports = AppServer;