const path = require("path");
const cluster = require("cluster");
const { MAIN_PROCESS_PORT } = require("../Config/index");
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

    koaListenOnPort = MAIN_PROCESS_PORT; // koa服务监听的端口
    
    get workers() { return cluster.workers }; // 子进程hash表，{id: 子进程worker}

    constructor() {
        this.on();
    }

    /**
    * 设置下一次创建子进程的配置
    */
    setupPrimary() {
        cluster.setupPrimary({
            execArgv: [],
            exec: path.resolve(__dirname, "../Server/index.js"), // 执行文件
            args: [this.koaListenOnPort + 1], // 传进子进程的参数
            silent: false,
            // stdio: ,
            // uid: ,
            // gid: ,
            // inspectPort: ,
            // serialization: ,
            // cwd: ,
            // windowsHide: ,
        })
    }

    /**
     * 创建并返回一个工作进程实例(统一由主进程调用)
     * @returns {import("cluster").Worker | null} 
     */
    createChildProcess() {
        if (this.isMaster) {
            this.setupPrimary();
            const childProcess = cluster.fork();
            return childProcess;
        }
        return null;
    }

    on() {
        cluster.on("fork", (worker) => {
            console.log(`已创建子进程, pid = ${worker.process.pid}`);
        })
        cluster.on("listening", (worker, address) => {
            console.log(`已建立监听, pid = ${worker.process.pid}`);
        })
        cluster.on("exit", (worker, code, signal) => {
            console.log(`子进程已关闭", pid = ${worker.process.pid}`);
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

    currentWorker = cluster.worker; // 当前进程worker实例
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