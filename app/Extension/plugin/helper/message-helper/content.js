module.exports =
`
class ContentMessageHelper {
    static instance = new ContentMessageHelper();
    static getInstance() {
        if (!ContentMessageHelper.instance) ContentMessageHelper.instance = new ContentMessageHelper();
        return ContentMessageHelper.instance;
    }
    constructor() {
        // 监听来自others的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            // 处理来自others的消息
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

            // 另外也通知下injtect
            asyncCall(() => window.postMessage({ type: eventName, message: responseMessage }), true);

            return isAsync;
        })
    }

    /** 内容脚本(content_scripts) 和 扩张页面options_page,bakcground,popup）通信 ---------------------------------------------------------------- */

    map = {};
    /**
     * 发送事件
     * 从内容脚本(content_scripts) 发送到 扩展页面（options_page,bakcground,popup）
     * @param {string} eventName 
     * @param {any} message
     * @returns {Promise<any>}
     */
    async callFromContent(eventName, message) {
        return chrome.runtime.sendMessage({
            eventName,
            message
        });
    }

    /**
     * 监听事件
     * 接收 扩展页面（options_page,bakcground,popup）发送的事件
     * @param {string} eventName
     * @param {(request: {message: any}, sender) => any} handler 
     * @returns {string}
     */
    listenFromOthers(eventName, handler) {
        if (eventName && handler) {
            this.map[eventName] = handler;
        }
    }

    /**
     * 卸载监听
     * @param {string} eventName
     * @returns {void} 
     */
    unlistenEvent(eventName) {
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

    /** 内容脚本(content_scripts) 和 扩张页面options_page,bakcground,popup）通信 end ---------------------------------------------------------------- */
}

ContentMessageHelper.getInstance();
`
