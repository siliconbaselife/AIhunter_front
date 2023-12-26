const { pathToRegexp } = require("path-to-regexp");
const LocalStoageHelper = require("../../utils/LocalStorage/index");
const Result  = require("../Domain/Result");

// 包含路由(所有)
const includePaths = pathToRegexp("*");

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
        
    }
    next();
}