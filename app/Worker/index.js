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
        ProcessControl.listenMessage(PROCESS_CONSTANTS.ACCOUNT_REGISTER_EVENT_TYPE, (data, reject) => {
            console.log("绑定账号: ", data);
            const { platformType, account_name } = data;
            return new Promise((rs, rj) => {
                manage.register(platformType, account_name, rs, rj);
            }).catch(reject)
        });

        ProcessControl.listenMessage(PROCESS_CONSTANTS.ACCOUNT_EXECUTE_EVENT_TYPE, (data, reject) => {
            console.log("启动账号: ", data);
            const { platformType, account_name, account_id } = this.accountInfo;
            manage.execute(platformType, account_name, account_id);
        });
    }
}

new WorkerHandler()