module.exports =
`
class ContentMessageHelper {
    static instance = new ContentMessageHelper();
    static getInstance() {
        if (!ContentMessageHelper.instance) ContentMessageHelper.instance = new ContentMessageHelper();
        return ContentMessageHelper.instance;
    }
    constructor() {
        // 监听来自inject的消息
        window.addEventListener("message", (e) => {
            // 处理来自Inject的消息
            const data = e.data || {};
            const { type, message } = data;
            const cbObj = this.injectMap[type] || {};
            Object.keys(cbObj).forEach(key => {
                let cb = cbObj[key];
                if (typeof cb === "function") {
                    asyncCall(() => cb(message));
                }
            })

            // 另外也通知下 扩展页面（options_page,bakcground,popup
            this.callFromContent(type, message).catch(() => { })
        })

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

    /** 内容脚本(content_scripts) 和 扩张页面options_page,bakcground,popup）通信 end ---------------------------------------------------------------- */




    /** 内容脚本(content_scripts) 和 被注入页面 通信 ----------------------------------------------------------------------------------------------- */
    injectMap = {};

    /**
     * 监听从Inject发送的消息
     * @param {string} eventName
     * @param {({request: {url: string, method: string, headers: {[{key: string}] : string}, body: any }, response: any}) => void} handler
     * @returns { string | undefined }
     */
    listenFromInject(eventName, handler) {
        if (eventName && handler) {
            const id = uuid(8, 16);
            this.injectMap[eventName] = this.injectMap[eventName] || {};
            this.injectMap[eventName][id] = handler;
            return id;
        }
    }

    /**
     * 卸载对Inject的监听
     * @param {string} eventName 
     * @param {string | undefined | null} id 
     * @returns 
     */
    unlistenFromInject(eventName, id) {
        const cbObj = this.injectMap[eventName];
        if (!cbObj) return;
        if (!id) {
            delete this.injectMap[eventName];
        } else if (cbObj[id]) {
            delete cbObj[id]
        }
    }

    /**
     * 卸载所有Inject的监听
     */
    unListenAllFromInject() {
        this.injectMap = {};
    }

    /** 内容脚本(content_scripts) 和 被注入页面 通信 end ----------------------------------------------------------------------------------------------- */

}

ContentMessageHelper.getInstance();
`
