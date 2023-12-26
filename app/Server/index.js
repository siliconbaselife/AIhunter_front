const Koa = require("koa");
const useRoute = require("./Controller/index");

class AppServer {
    app = new Koa();
    port = 4000;

    constructor() {
        useRoute(this.app); // 加载路由
        this.app.listen(this.port, "0.0.0.0", this.onAppListened);
    }

    onAppListened() {
        console.log(`服务已启动，进程ID为 ${process.pid}`);
    }
}

module.exports = AppServer;