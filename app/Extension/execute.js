const TabHelper = require("./Tab");
class ExecuteHelper {
    /** @private */
    static instance = new ExecuteHelper();
    /**
     * 获取实例(单例)
     * @returns {ExecuteHelper}
     */
    static getInstance() {
        if (!ExecuteHelper.instance) ExecuteHelper.instance = new ExecuteHelper();
        return ExecuteHelper.instance;
    }

    Linkedin = {
        /**
         * 执行一次领英打招呼任务
         * @param {string} url 链接 
         * @param {string} chatTemplate 话术模板
         * @returns {Promise<{status: "fail" | "success", payload: any}>}
         */
        async chat(url, chatTemplate) {
            const result = await TabHelper.createTab({
                url,
                active: false,
                selected: false,
                args: ["linkedin_profile_chat", chatTemplate]
            });
            console.log("执行结果", result);
            return result
        },

        /**
         * 执行一次领英 搜集简历 个人版 任务
         * @param {string} url 链接
         * @returns {Promise<{status: "fail" | "success", payload: any}>}
         */
        async resume(url) {
            const result = await TabHelper.createTab({
                url,
                active: false,
                selected: false,
                args: ["linkedin_profile_fetch"]
            })
            console.log("执行结果", result);
            return result;
        }
    }

    test = { // 测试
        async search(url, keyword) {
            const result = await TabHelper.createTab({
                url,
                active: false,
                selected: false,
                args: ["testMission", keyword]
            })
            console.log("执行结果", result);
            return result;
        }
    }
}

module.exports = ExecuteHelper.getInstance();