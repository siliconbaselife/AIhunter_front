/** @typedef {{index: number,openerTabId?: number | undefined,title?: string | undefined,url?: string | undefined,pendingUrl?: string | undefined,pinned: boolean,highlighted: boolean,windowId: number,active: boolean,favIconUrl?: string | undefined,id?: number | undefined,incognito: boolean,selected: boolean,audible?: boolean | undefined,discarded: boolean,autoDiscardable: boolean,mutedInfo?: MutedInfo | undefined,width?: number | undefined,height?: number | undefined,sessionId?: string | undefined, groupId: number}} Tab */

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
     * 创建新标签页(带参数)
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

        this.closeTab(tab.id);

        return { result };
    }

    
    /**
     * 向标签页发送消息
     * @param {number} tabId 标签页id(该标签页的链接一定要是插件manifest.json的content_scripts有定义的)
     * @param {string} eventName 事件名称
     * @param {any} message 消息 
     * @returns {Promise<any>} 
     */
    async sendMessageToTab(tabId, eventName, message) {
        return this.extension.evaluate((id, name, msg) => {
            return globalThis.OMH.callFromOthers(id, name, msg)
        }, tabId, eventName, message)
    }


    /**
     * 创建一个标签页
     * @param { {index?: number , openerTabId?: number ,url?: string ,pinned?: boolean ,windowId?: number ,active?: boolean ,selected?: boolean }} options
     * @returns { Promise<Tab> }
     */
    async createATab(options) {
        return this.extension.evaluate((insideOptions) => {
            return chrome.tabs.create(insideOptions);
        }, options)
    }

    /**
     * 关闭一个标签页
     * @param {number} tabId
     * @returns {Promise<void>} 
     */
    async closeTab(tabId) { // 标签页id
        return this.extension.evaluate((id) => {
            chrome.tabs.remove(id)
        }, tabId)
    }
}

module.exports = TabHelper.getInstance();