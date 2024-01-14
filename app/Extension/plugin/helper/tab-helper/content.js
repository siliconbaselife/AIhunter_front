module.exports = `
class TabHelper {
    /** @private */
    static instance = new TabHelper();
    /**
     * 获取实例(单例)
     * @returns {TabHelper}
     */
    static getInstance() {
        if (!TabHelper.instance) TabHelper.instance = new TabHelper();
        return TabHelper.instance;
    }

    /**
     * 获取当前标签页的参数
     * @returns {Promise<IArguments>}
     */
    async getCurrentTabParams() {
        let params;
        await waitCondition(() => {
            let paramsJson = document && document.body && document.body.dataset && document.body.dataset["__sipk"];
            try {
                if (paramsJson) {
                    let paramsObj = JSON.parse(paramsJson);
                    params = Object.keys(paramsObj).map(key => paramsObj[key]);
                }
            } catch { }
            if (params) return true;
        }, 500, 10 * 1000); // (最多等10秒)
        return params;
    }

    /**
     * 标记已成功或者失败, 并返回标记信息给(打开这个新标签的父页面)
     * @param {"success" | "fail"} status 状态
     * @param {any} payload 标记信息
     */
    async markExecuteStatus(status, payload) {
        document.body.dataset["__sisk"] = JSON.stringify({
            status,
            payload
        });
        await sleep(1000); // 等1秒，让那边检测到变化，通知父页面
    }
}

TabHelper.getInstance();
`