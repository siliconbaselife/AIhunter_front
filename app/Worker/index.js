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
            const { platformType, account_name } = data;
            return new Promise((rs, rj) => {
                manage.register(platformType, account_name, rs, rj);
            })
        });

        ProcessControl.listenMessage(PROCESS_CONSTANTS.ACCOUNT_EXECUTE_EVENT_TYPE, (data) => {
            console.log("启动账号: ", data);
            const { platformType, account_name, account_id } = this.accountInfo;
            console.log("accountInfo: ", this.accountInfo);
            manage.execute(platformType, account_name, account_id);
        });

        ProcessControl.listenMessage(PROCESS_CONSTANTS.ACCOUNT_GET_JOB_INFO_EVENT_TYPE, (data) => {
            console.log("扫描岗位账号: ", data);
            const { platformType, account_name, account_id } = this.accountInfo;
            console.log("accountInfo: ", this.accountInfo);
            return new Promise((rs, rj) => {
                manage.fetchJobInfo(platformType, account_name, data.account_id, rs, rj);
            })
        });
        
    }
}

new WorkerHandler()