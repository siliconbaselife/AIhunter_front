const Router = require("koa-router");
const Result = require("../Domain/Result");

const userRouter = new Router({ prefix: "/user" });

userRouter.get("/login", async (ctx, next) => {
    const {} = ctx.params;
    return Result.ok("test");
})


module.exports = userRouter;