const { sleep } = require("../utils");
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
        async resume(url, param2) {
            const result = await TabHelper.createTab({
                url,
                active: false,
                selected: false,
                args: ["linkedin_profile_fetch", param2]
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
        },

        async search2(url, keyword) {
            const tab = await TabHelper.createATab({
                url,
                active: false,
                selected: false,
            })

            await sleep(1000);

            const result1 = await TabHelper.sendMessageToTab(tab.id, "testMission", keyword);

            console.log("result1", result1);

            const result2 = await TabHelper.sendMessageToTab(tab.id, "testMission2", "12344");

            console.log("result2", result2);
            return {result1, result2, tab}
        }
    }
}

module.exports = ExecuteHelper.getInstance();