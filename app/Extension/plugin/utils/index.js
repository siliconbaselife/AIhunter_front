module.exports = `
// 共享公共方法
/**
 * uuid
 * @param {number} len 
 * @param {number} radix 
 * @returns {string}
 */
const uuid = (len, radix) => {
    let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    let uuid = [], i;
    radix = radix || chars.length;

    if (len) {
        for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
    } else {
        let r;

        // rfc4122 requires these characters
        uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
        uuid[14] = '4';
        for (i = 0; i < 36; i++) {
            if (!uuid[i]) {
                r = 0 | Math.random() * 16;
                uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
            }
        }
    }

    return uuid.join('');
}

/**
 * 简单的异步调用
 * @param {Function} cb 
 * @param {boolean} ignoreError
 */
const asyncCall = (cb, ignoreError = false) => {
    let timer = setTimeout(() => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (ignoreError) { try { cb(); } catch { } }
        else cb();
    }, 0);
}

/**
 * 加载动画样式库
 */
const loadAnimateCss = () => {
    try {
        const linkEl = document.createElement("link");
        linkEl.href = chrome.runtime.getURL("assets/animate/animate.css");
        linkEl.rel = "stylesheet";
        document.head.appendChild(linkEl);
    } catch (error) {
        console.log("加载样式库失败,如果环境没有DOM,可忽略", error);
    }
}

/**
 * 等待完成
 * @param {() => boolean} cb 回调
 * @param { number } interval 间隔ms
 * @param { number } maxTime 最大等待时间
 * @returns { Promise<void> }
 */
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

/**
 * 等待x毫秒
 * @param {number} time 等待时间 
 * @returns {Promise<void>}
 */
const sleep = async (time = 500) => {
    return new Promise(rs => {
        let timer = setTimeout(() => {
            if (timer) {
                clearTimeout(timer);
                timer = null
            }
            rs()
        }, time)
    })
}

/**
 * Blob转文件
 * @param {Blob} blob blob
 * @param {string} filename 文件名称
 * @param {FilePropertyBag} options 其他选项
 * @returns {Promise<File>}
 */
const blobToFile = async (blob, filename, options) => {
    return new File([blob], filename, options)
}

`