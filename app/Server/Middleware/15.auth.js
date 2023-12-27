const { pathToRegexp } = require("path-to-regexp");
const UserManager = require("../../User/index");
const Result  = require("../Domain/Result");

// 包含路由(所有)
const includePaths = pathToRegexp("/");

// 排除路由(不需要鉴权)
const excludePaths = pathToRegexp([
    "user/login"
]);

/**
 * 鉴权
 * @param {import("koa").ParameterizedContext<import("koa").DefaultState, import("koa").DefaultContext, any>} ctx 
 * @param {import("koa").Next} next 
 */
module.exports = (ctx, next) => {
    const url = ctx.request.url;
    if (includePaths.test(url) === true && excludePaths.test(url) === false) {
        const headers = ctx.request.headers;
        const user_name = headers.user_name;
        if (!user_name) {
            ctx.body = Result.fail(null, Result.TOKEN_MISSED, "未登录");
            return;
        }
        const userInfo = UserManager.getUserInfo(user_name);
        if (!userInfo) {
            ctx.body = Result.fail(null, Result.TOKEN_INVALID, "登录凭证无效");
            return;
        }
        ctx.userInfo = userInfo; // 给ctx赋值userInfo
    }
    next();
}