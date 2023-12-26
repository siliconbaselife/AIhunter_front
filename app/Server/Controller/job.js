const Router = require("koa-router");

const jobRouter = new Router({ prefix: "/job" });

jobRouter.get("/job", async (ctx, next) => {
    const { platform = "", job = ""} = ctx.params;
    
})

module.exports = jobRouter;