const Router = require("koa-router");
const Result = require("../Domain/Result");

const userRouter = new Router({ prefix: "/user" });

userRouter.post("/login", async (ctx, next) => {
    // const {} = ctx.body;
    console.log(ctx.request.body);
    ctx.body = Result.ok(ctx.request.body);
})


module.exports = userRouter;