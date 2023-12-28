const ProcessControl = require("../ProcessControl/index");
const { PROCESS_CONSTANTS } = require("../Config/index");


class WorkerHandler {
    /** @type {import("cluster").Worker} */
    worker = ProcessControl.currentWorker;
    accountInfo = ProcessControl.accountInfo;
    constructor() {
        this.listen();
    }

    listen() {
        // 绑定账号
        ProcessControl.listenMessage(PROCESS_CONSTANTS.ACCOUNT_REGISTER_EVENT_TYPE, (data) => {
            console.log("绑定账号", data);
            return "hello"
        })
    }
}

new WorkerHandler()