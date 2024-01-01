const Router = require("koa-router");
const Result = require("../Domain/Result");

const { PROCESS_CONSTANTS } = require("../../Config/index");
const ProcessControl = require("../../ProcessControl/index");
const { sleep } = require("../../utils");

const jobRouter = new Router({ prefix: "/account" });

/** 添加任务 参数: {platformType: "xxx", account_name: "xxx"} */
jobRouter.post("/register", async (ctx, next) => {
    const { platformType, account_name } = ctx.request.body || {};
    /** @type {import("cluster").Worker}  */
    const worker = ProcessControl.createTemporaryChildProcess(ctx.userInfo, { platformType, account_name });
    try {
        const accountInfo = await ProcessControl.sendMessage(worker, PROCESS_CONSTANTS.ACCOUNT_REGISTER_EVENT_TYPE, { platformType, account_name });
        ProcessControl.killChildProcess(worker);
        ctx.body = Result.ok(accountInfo);
    } catch (error) {
        ctx.body = Result.fail(error);
    }

})

/** 开始任务 参数: {platformType: "xxx", account_name: "xxx", account_id: "xxx"} */
jobRouter.post("/execute", async (ctx, next) => {
    const { platformType, account_name, account_id } = ctx.request.body || {};
    if (!platformType) ctx.body = Result.fail("没有平台类型: platformType");
    else if (!account_id) ctx.body = Result.fail("没有账号id: account_id");
    else {
        const worker = ProcessControl.createChildProcess(ctx.userInfo, { account_id, account_name, platformType });
        await sleep(1000);
        ProcessControl.sendMessage(worker, PROCESS_CONSTANTS.ACCOUNT_EXECUTE_EVENT_TYPE)
        ctx.body = Result.ok();
    }
})

/** 停止任务 参数: {account_id: "xxx"} */
jobRouter.post("/stop", async (ctx, next) => {
    const { account_id } = ctx.request.body || {};
    if (!account_id) {
        ctx.body = Result.fail("没有账号id: account_id");
        return;
    }
    /** @type {import("cluster").Worker}  */
    const worker = ProcessControl.getChildProcess({ prop: "account_id", value: account_id });
    if (!worker) {
        ctx.body = Result.fail("没有找到对应的进程");
        return;
    }
    ProcessControl.killChildProcess(worker);
    ctx.body = Result.ok("任务已停止");
})

/** 获取任务状态 参数: {account_ids: "xxx,xx"} */
jobRouter.get("/status", async (ctx, next) => {
    const { account_ids } = ctx.request.query || {};
    const accountIds = account_ids && account_ids.split(',') || [];
    const resultObj = {};
    accountIds.forEach(account_id => {
        /** @type {(import "cluster").Worker} */
        let worker = ProcessControl.getChildProcess({ prop: "account_id", value: account_id })
        if (worker) { // 如果目前存在account_id对应的进程
            resultObj[account_id] = { 
                id: worker.id, // worker_id, 这个参数前端暂时用不上,留在后续有需要再使用
                pid: worker.process.pid, // 进程id, 这个参数前端暂时用不上,留在后续有需要再使用
                is_not_dead: !worker.isDead(),
            }
        }
    })
    ctx.body = Result.ok(resultObj);
})

module.exports = jobRouter;