const path = require("path");
const cluster = require("cluster");
const { PROCESS_CONSTANTS } = require("../Config/index");
const EventBus = require("../utils/EventBus/index");
const logger = require("../Logger/index");
// import cluster from "cluster";

/**
 * 主进程控制 ------------------------------------------------------------------------------------
 */
class MainProcessManager {
    static instance;
    /**
    * 获取实例(单例)
    * @returns {MainProcessManager}
    */
    static getInstance() {
        if (!MainProcessManager.instance) MainProcessManager.instance = new MainProcessManager();
        return MainProcessManager.instance;
    }

    isPrimary = true; // 当前进程是否主进程

    koaListenOnPort = PROCESS_CONSTANTS.MAIN_KOA_LISTEN_PORT; // koa服务监听的端口

    /** @type { {[account_id: string]: { userInfo: {user_name: string, email?: string}, accountInfo: {account_id: string, account_name?: string, platformType: string} , worker: import("cluster").Worker}} } */
    workers = {}; // 子进程hash表, pid: {accountInfo, worker}

    constructor() {
        this.addListenerOnCluster();
    }

    /**
     * @param { {user_name: string, email?: string}} userInfo 用户信息
     * @param { {account_id: string, account_name?: string, platformType: string} } accountInfo 账号信息
     * 设置下一次创建子进程的配置
    */
    setupPrimary(userInfo, accountInfo) {
        cluster.setupPrimary({
            execArgv: [],
            exec: path.resolve(__dirname, "../Worker/index.js"), // 执行文件
            args: [this.koaListenOnPort, JSON.stringify({ userInfo, accountInfo })], // 传进子进程的参数
            silent: false,
        })
    }

    /**
     * 创建并返回一个临时的工作进程实例
     * @param { {user_name: string, email?: string}} userInfo 用户信息
     * @param { ?{account_id: string, account_name?: string, platformType: string} } accountInfo
     * @returns {import("cluster").Worker} 
     */
    createTemporaryChildProcess(userInfo, accountInfo) {
        if (!userInfo || !userInfo.user_name) throw new Error("创建子进程失败: 没有user_name");
        this.setupPrimary(userInfo, accountInfo);
        const worker = cluster.fork();
        return worker;
    }

    /**
     * 创建并返回一个工作进程实例(会保存)
     * @param { {user_name: string, email?: string}} userInfo 用户信息
     * @param { {account_id: string, account_name?: string, platformType: string} } accountInfo
     * @returns {import("cluster").Worker} 
     */
    createChildProcess(userInfo, accountInfo) {
        if (!userInfo || !userInfo.user_name) throw new Error("创建子进程失败: 没有user_name");
        else if (!accountInfo || !accountInfo.account_id) throw new Error("创建子进程失败: 没有account_id");
        this.setupPrimary(userInfo, accountInfo);
        const worker = cluster.fork();
        this.workers[accountInfo.account_id] = { userInfo, accountInfo, worker };
        return worker;
    }

    /**
     * 查找一个子进程
     * @param {{prop: "pid" | "account_id" | "id", value: any}} param0  
     * @returns {import("cluster").Worker | undefined} 
     */
    getChildProcess({ prop, value }) {
        let worker;
        switch (prop) {
            case "account_id": {
                worker = this.workers[value] && this.workers[value].worker;
                break;
            }
            case "pid": {
                const key = Object.keys(this.workers).find(account_id => {
                    const cProcess = this.workers[account_id];
                    return cProcess.worker.process.pid === value;
                })
                if (key) worker = this.workers[key].worker;
                break;
            }
            case "id": {
                worker = cluster.workers[value];
                break;
            }
        }
        return worker;
    }

    /**
     * 发送消息
     * @param {import("cluster").Worker | {prop: "pid" | "account_id" | "id", value: any}} findOptions worker或者account_id
     * @param {string} eventName 
     * @param {any} data 
     * @returns {Promise<any>}
     */
    async sendMessage(findOptions, eventName, data) {
        return new Promise((rs, rj) => {
            let worker;
            if (findOptions instanceof cluster.Worker) worker = findOptions;
            else worker = this.getChildProcess(findOptions);
            if (!worker) rj("没有找到对应的子进程");
            const listenerID = EventBus.listen(`${eventName}${worker.process.pid}`, data => {
                EventBus.unListen(`${eventName}${worker.process.pid}`, listenerID);
                rs(data);
            });
            worker.on("exit", (code, signal) => {
                rj(`进程异常关闭, 还没等到返回消息: code = ${code}, signal =${signal}`);
            })
            worker.send({ eventName, data });
        })
    }

    /**
     * 关掉一个子进程
     * @param {import("cluster").Worker | {prop: "pid" | "account_id" | "id", value: any}} findOptions worker或者account_id
     */
    async killChildProcess(findOptions) {
        let worker;
        if (findOptions instanceof cluster.Worker) worker = findOptions;
        else worker = this.getChildProcess(findOptions);
        if (worker) {
            worker.kill(PROCESS_CONSTANTS.PROCESS_NORMAL_CLOASE_SINGAL);
            this.workersRemoveChildProcess(worker);
        }
    }

    /**
     * workers列表移除一个进程(private的,外面不要调用)
     * @private
     * @param {import("cluster").Worker} worker 
     */
    workersRemoveChildProcess(worker) {
        const pid = worker.process.pid;
        const key = Object.keys(this.workers).find(account_id => {
            const cProcess = this.workers[account_id];
            return cProcess.worker.process.pid === pid;
        })
        if (key) { delete this.workers[key] };
    }

    /**
    * 处理主cluster接收到的事件(private的,外面不要调用)
    * @private
    */
    addListenerOnCluster() {
        cluster.on("fork", (worker) => {
            console.log(`已创建子进程, pid = ${worker.process.pid}`);
            logger.info(`已创建子进程, pid = ${worker.process.pid}`);
        })
        cluster.on("exit", (worker, code, signal) => {
            if (signal === PROCESS_CONSTANTS.PROCESS_NORMAL_CLOASE_SINGAL || signal === 0) { // 正常关闭
            } else { // 异常关闭
                logger.error("异常关闭")
            }
            this.workersRemoveChildProcess(worker);
            logger.info(`子进程已关闭, pid = ${worker.process.pid}, ${code}, ${signal}`);
        })
        cluster.on("message", (worker, message) => {
            const pid = worker.process.pid;
            logger.info(`cluster监听到message, 子进程pid = ${pid}, message = ${JSON.stringify(message)}`);
            const { eventName, data } = message;
            eventName && EventBus.call(`${eventName}${pid}`, data);
        })
    }
}

// 主进程控制 end ------------------------------------------------------------------------------------------------------

/**
 * 子进程控制 ------------------------------------------------------------------------------------
 */
class ChildProcessManager {
    static instance;
    /**
     * 获取实例(单例)
     * @returns {ChildProcessManager}
     */
    static getInstance() {
        if (!ChildProcessManager.instance) ChildProcessManager.instance = new ChildProcessManager();
        return ChildProcessManager.instance;
    }

    isPrimary = false; // 当前进程是否主进程

    koaListenOnPort = process.argv[2]; // koa服务监听的端口
    userInfo = JSON.parse(process.argv[3]).userInfo; // 用户信息
    accountInfo = JSON.parse(process.argv[3]).accountInfo; // 账号信息

    /** @type {import("cluster".Worker)} */
    currentWorker = cluster.worker; // 当前进程worker实例

    constructor() {
        this.addListenerOnWorker();
    }

    /**
     * 关闭当前进程
     */
    close() {
        this.currentWorker.kill(PROCESS_CONSTANTS.PROCESS_NORMAL_CLOASE_SINGAL);
    }

    /**
     * 处理worker接收到的事件(private的,外面不要调用)
     * @private
     */
    addListenerOnWorker() {
        this.currentWorker.on("message", (message) => {
            const { eventName, data } = message || {};
            if (!eventName) return;
            EventBus.call(eventName, data);
        })
    }

    /**
     * 监听来自主进程的消息
     * @param {string} eventName 
     * @param {(data: any) => (any | void | Promise<any|void>)} cb 回调函数，返回值会传给主进程
     * @
     */
    listenMessage(eventName, cb) {
        const listenerID = EventBus.listen(eventName, async (data) => {
            const result = await cb(data);
            this.currentWorker.send({ eventName, data: result });
        })
        return listenerID;
    }
}

// 子进程控制end ------------------------------------------------------------------------------------

/**
 * 根据当前进程返回对应的ProcessManager实例
 * @returns {MainProcessManager | ChildProcessManager}
 */
const getProcessManagerInstace = () => {
    if (cluster.isPrimary) return MainProcessManager.getInstance();
    else return ChildProcessManager.getInstance();
}

module.exports = getProcessManagerInstace();