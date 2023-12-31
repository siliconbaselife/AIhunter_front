const { LOCAL_STORAGE_CONSTANTS } = require("../../Config/index");
const NodeLocalStorage = require("node-localstorage");
class LocalStorageHelper {
    static instance;
    /**
     * 获取LocalStorage实例(单例)
     * @returns {LocalStorageHelper}
     */
    static getInstance() {
        if (!LocalStorageHelper.instance) LocalStorageHelper.instance = new LocalStorageHelper();
        return LocalStorageHelper.instance;
    }

    constructor() {
        this.storage = new NodeLocalStorage.LocalStorage(LOCAL_STORAGE_CONSTANTS.STORE_PATH);
    }

    /**
     * 保存
     * @param {string} k key 
     * @param {any} v 值
     * @param {number} t 分钟(如果不传，则不会过期)
     * @returns {void}
     */
    set(k, v, t) {
        let timestamp = new Date().valueOf()
        timestamp = t ? (timestamp / 1000 + t * 60) : 0;
        let setValue = {
            deadtime: timestamp,
            value: v
        }
        this.storage.setItem(`${k}`, JSON.stringify(setValue))
    }
    /**
     * 读取
     * @param {string} k 
     * @returns {any}
     */
    get(k) {
        let getValueJson = this.storage.getItem(`${k}`) || ""
        if (getValueJson) {
            let getValue = JSON.parse(getValueJson)
            if (getValue.deadtime && parseInt(getValue.deadtime) < new Date().valueOf() / 1000) return ""
            let value = getValue.value
            return value
        }
        return undefined
    }
    /**
     * 是否存在key
     * @param {string} k 
     * @returns {boolean}
     */
    hasKey(k) {
        let getValueJson = this.storage.getItem(`${k}`) || ""
        if (getValueJson) {
            let getValue = JSON.parse(getValueJson)
            return !!getValue.deadtime
        }
        return false
    }
    /**
     * 移除一个
     * @param {string} k 
     */
    remove(k) {
        this.storage.removeItem(`${k}`)
    }
    /**
     * 移除所有
     */
    clear() {
        this.storage.clear()
    }
}

module.exports = LocalStorageHelper.getInstance();