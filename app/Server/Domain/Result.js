class Result {
    static SUCCESS = 0;
    static FAIL = -1;

    static TOKEN_MISSED = 1000;
    static TOKEN_INVALID = 1001;

    code;
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
     * @param {any} data 
     * @param {number} code 
     * @param {string} msg 
     * @returns {Result}
     */
    static fail(data, code, msg) {
        return Result.restResult(data || null, code || Result.FAIL, msg || "操作失败");
    }

    /**
     * 返回
     * @param {any} data 
     * @param {number} code 
     * @param {string} msg 
     * @returns {Result}
     */
    static restResult(data, code, msg) {
        const r = new Result();
        r.code = code;
        r.data = data;
        r.msg = msg;
        return r;
    }
}

module.exports = Result;