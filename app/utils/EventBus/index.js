const { uuid } = require("../index.js");
class EventBusHelper {
    static instance;
    /**
     * 获取实例(单例)
     * @returns {EventBusHelper}
     */
    static getInstance() {
        if (!EventBusHelper.instance) {
            EventBusHelper.instance = new EventBusHelper();
        }
        return EventBusHelper.instance;
    }

    call(eventName, data) {
        if (eventName && this.map && eventName in this.map) {
            let handlers = this.map[eventName];
            for (let key in handlers) {
                if (handlers[key]) {
                    handlers[key](data);
                }
            }
        }
    }
    listen(eventName, handler) {
        if (eventName && handler) {
            this.map || (this.map = {});
            this.map[eventName] || (this.map[eventName] = {});
            let id = uuid(8, 16);
            this.map[eventName][id] = handler;
            return id;
        }
    }
    unListen(eventName, id) {
        if (eventName && id && this.map && eventName in this.map && id in this.map[eventName]) {
            let handlers = this.map[eventName];
            delete handlers[id];
            for (let key in handlers) {
                if (handlers[key]) {
                    return;
                }
            }
            delete this.map[eventName];
        }
    }
    unListenEvent(eventName) {
        if (eventName && this.map && eventName in this.map) {
            delete this.map[eventName];
        }
    }
    unListenAll() {
        if (this.map) {
            delete this.map;
        }
    }
    register(eventName, handler) {
        let id = this.listen(eventName, handler);
        if (id) {
            let _this = this;
            return function () {
                _this.unListen(eventName, id);
            };
        }
    }
}
module.exports = EventBusHelper.getInstance();
