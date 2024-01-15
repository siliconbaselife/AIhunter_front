
        // Background.js
        
class OthersMessageHelper {
    static instance = new OthersMessageHelper();
    static getInstance() {
        if (!OthersMessageHelper.instance) OthersMessageHelper.instance = new OthersMessageHelper();
        return OthersMessageHelper.instance;
    }
    constructor() {
        // 监听来自content_scripts的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            let isAsync = false;
            const eventName = request && request.eventName;
            const cb = this.map[eventName];
            let responseMessage = cb && cb(request.message, sender);
            if (responseMessage instanceof Promise) {
                responseMessage.then(message => {
                    sendResponse(message)
                })
                isAsync = true;
            } else {
                sendResponse(responseMessage);
            }

            return isAsync;
        })
    }

    map = {};

    /**
     * 发送事件
     * 从扩展页面（bakcground）发送到 内容脚本(content_scripts) 代码
     * @param {chrome.tabs.Tab.id | undefined} tabId
     * @param {string} eventName 
     * @param {any} message 
     * @returns {Promise<any>}
     */
    async callFromOthers(tabId, eventName, message) {
        tabId = tabId || (await chrome.tabs.query({ active: true, currentWindow: true })).id;
        return chrome.tabs.sendMessage(tabId, { eventName, message });
    }

    /**
     * 监听事件
     * 接收 内容脚本(content_scripts) 和 inject 发送的事件
     * @param {string} eventName 
     * @param {(request: {message: any}, sender) => any} handler 
     * @returns {string}
     */
    listenFromContent(eventName, handler) {
        if (eventName && handler) {
            this.map[eventName] = handler;
        }
    }

    /**
     * 卸载监听
     * @param {string} eventName
     * @returns {void} 
     */
    unlisten(eventName) {
        if (eventName && this[eventName]) {
            delete this.map[eventName]
        }
    }

    /**
     * 卸载所有监听
     */
    unListenAll() {
        this.map = {};
    }
}

globalThis.OMH = OthersMessageHelper.getInstance();

    