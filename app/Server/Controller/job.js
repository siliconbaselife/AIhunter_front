const Router = require("koa-router");
const Result = require("../Domain/Result");

const jobRouter = new Router({ prefix: "/job" });

jobRouter.get("/job", async (ctx, next) => {
    const { platform = "", job = ""} = ctx.params;
    return Result.ok("test");
})


module.exports = jobRouter;