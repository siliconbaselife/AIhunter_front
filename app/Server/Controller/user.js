const Router = require("koa-router");
const Result = require("../Domain/Result");

const ProcessControl = require("../../ProcessControl/index");
const UserManager = require("../../User/index");

const userRouter = new Router({ prefix: "/user" });

userRouter.post("/login", async (ctx, next) => {
    const { user_name, email } = ctx.request.body || {};
    ProcessControl.createChildProcess();
    if (!user_name) ctx.body = Result.fail("用户名不存在");
    else if (!email) ctx.body = Result.fail("邮箱不存在");
    else {
        UserManager.setUserInfo({ user_name, email });
        ctx.body = Result.ok();
    }
})


module.exports = userRouter;