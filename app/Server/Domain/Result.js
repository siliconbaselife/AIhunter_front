class Result {
    static SUCCESS = 0;
    static FAIL = -1;

    static TOKEN_MISSED = 1000;
    static TOKEN_INVALID = 1001;

    ret;
    msg;
    data;

    /**
     * 成功返回
     * @param {any} data 
     * @param {string} msg 
     * @returns {Result}
     */
    static ok(data, msg) {
        return Result.restResult(data || null, Result.SUCCESS, msg || "操作成功");
    }

    /**
     * 失败返回
     * @param {string} msg 
     * @param {number} ret 
     * @param {any} data 
     * @returns {Result}
     */
    static fail(msg, ret, data) {
        return Result.restResult(data || null, ret || Result.FAIL, msg || "操作失败");
    }

    /**
     * 返回
     * @param {any} data 
     * @param {number} ret 
     * @param {string} msg 
     * @returns {Result}
     */
    static restResult(data, ret, msg) {
        const r = new Result();
        r.ret = ret;
        r.data = data;
        r.msg = msg;
        return r;
    }
}

module.exports = Result;