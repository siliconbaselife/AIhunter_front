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
    /** @type {import("puppeteer").WebWorker} 扩展程序WebWorker实例 */
    extension;

    /**
     * 创建新标签页
     * @param { {index?: number , openerTabId?: number ,url?: string ,pinned?: boolean ,windowId?: number ,active?: boolean ,selected?: boolean, args: any[] }} options
     * @returns {Promise<{status: "fail" | "success", payload: any}>}
     */
    async createTab(options) {
        const args = options.args; // 传输过新页面的参数, 必须是个数组
        if (args) delete options.args;
        /** @type {chrome.tabs.Tab} */
        const tab = await this.extension.evaluate((insideOptions) => {
            return chrome.tabs.create(insideOptions)
        }, options);
        const res = await this.extension.evaluate((insideOptions) => {
            return chrome.scripting.executeScript({
                ...insideOptions,
                func: function () {
                    const waitCondition = async (cb, interval = 500, maxTime = 10000) => {
                        let success = cb();
                        if (success) return Promise.resolve();
                        else if (maxTime <= 0) return Promise.reject("等待超时");
                        return new Promise((rs) => {
                            let timer = setTimeout(() => {
                                if (timer) {
                                    clearTimeout(timer);
                                    timer = null
                                }
                                maxTime -= interval;
                                rs(waitCondition(cb, interval, maxTime))
                            }, interval);
                        })
                    }
                    document.body.dataset["__sipk"] = JSON.stringify(arguments);
                    let executeStatusJson;
                    return waitCondition(() => { // 最多等待新开页面执行40秒，拿到执行状态
                        executeStatusJson = document.body.dataset["__sisk"];
                        return !!executeStatusJson
                    }, 500, 40 * 1000).then(() => { // 最后返回
                        const executeStatus = JSON.parse(executeStatusJson);
                        return executeStatus;
                    }, (err) => ({ status: "fail", payload: err }));
                },
            });
        }, {
            target: { tabId: tab.id },
            args
        })
        const result = res[0].result;
        this.extension.evaluate((id) => { // 关闭2: 关闭新建的标签页
            chrome.tabs.remove(id);
        }, tab.id)

        return result;
    }
}

module.exports = TabHelper.getInstance();