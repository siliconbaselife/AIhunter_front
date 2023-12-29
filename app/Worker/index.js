const ProcessControl = require("../ProcessControl/index");
const { PROCESS_CONSTANTS } = require("../Config/index");
const manage = require("../Client/manage");


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
            console.log("绑定账号: ", data);
            let {platformType} = data;
            manage.register(platformType);

            return "hello"
        });

        ProcessControl.listenMessage(PROCESS_CONSTANTS.ACCOUNT_EXECUTE_EVENT_TYPE, (data) => {
            console.log("启动账号: ", data);

            manage.execute();
        });
    }
}

new WorkerHandler()