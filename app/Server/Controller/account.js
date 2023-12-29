const Router = require("koa-router");
const Result = require("../Domain/Result");

const { PROCESS_CONSTANTS } = require("../../Config/index");
const ProcessControl = require("../../ProcessControl/index");

const jobRouter = new Router({ prefix: "/account" });

jobRouter.post("/register", async (ctx, next) => {
    const { platformType, account_name } = ctx.request.body || {};
    /** @type {import("cluster").Worker}  */
    const worker = ProcessControl.createTemporaryChildProcess(ctx.userInfo, { platformType, account_name });
    try {
        const accountInfo = await ProcessControl.sendMessage(worker, PROCESS_CONSTANTS.ACCOUNT_REGISTER_EVENT_TYPE, { platformType, account_name });
        ProcessControl.killChildProcess(worker);
        ctx.body = Result.ok(accountInfo);
    } catch (error) {
        ctx.body = Result.fail(undefined, undefined, error);
    }

})

jobRouter.post("/execute", async (ctx, next) => {
    const { platformType, account_name, account_id } = ctx.request.body || {};
    if (!platformType) ctx.body = Result.fail("没有平台类型: platformType");
    else if (!account_id) ctx.body = Result.fail("没有账号id: account");
    else {
        const worker = ProcessControl.createChildProcess(ctx.userInfo, { account_id, account_name, platformType });
        ProcessControl.sendMessage(worker, PROCESS_CONSTANTS.ACCOUNT_EXECUTE_EVENT_TYPE)
        ctx.body = Result.ok();
    }
})

module.exports = jobRouter;