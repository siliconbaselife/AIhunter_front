const Logger = require("../Logger");
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

    /**
     * 监听请求，拿到结果
     * @param {import("puppeteer").Page} page 页面实例 
     * @param {string[]} urls 请求包含的url片段 数组
     * @param {?number} maxTimeout 最大等待时间
     * @returns {Promise<Record<string, any>>}
     */
    waitForResponse(page, urls, maxTimeout = 10 * 1000) {
        let resultObj = {};
        const getResponses = async (response) => {
            const responseUrl = response.url();
            const method = response.request().method().toUpperCase();
            console.log("responseUrl", responseUrl);

            for (let url of urls) {
                if (responseUrl.indexOf(url) !== -1 && method !== "OPTION") resultObj[url] = await response.json()
            }
        }

        return new Promise((resolve, reject) => {
            let waitTime = 0;
            const check = async () => {
                if (waitTime >= maxTimeout) return reject(`等待请求超时 ${waitTime} ${maxTimeout}`);
                await sleep(1000);
                waitTime += 1000;
                if (Object.keys(resultObj).length === urls.length) {
                    page.removeListener('response', getResponses);
                    return resolve(resultObj);
                }
                check();
            };

            try {
                check();
            } catch (e) {
                Logger.error("waitForResponse error: ", e);
            }
        });



        page.on('response', getResponses);
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

    liepin = {
        /**
         * 获取候选人信息
         * @param {string} url 跳转链接
         * @returns {Promise<{status: "success" | "fail", tab: import("./Tab").Tab, peopleInfo: any, error: string, peopleInfo: any}>}
         */
        async resume(url) {
            const tab = await TabHelper.createATab({
                url,
                active: false,
                selected: false,
            })

            await sleep(1500);
            try {
                const { status, error, peopleInfo } = await TabHelper.sendMessageToTab(tab.id, "liepin_profile_search");
                if (error) Logger.error(`liepin_profile_search 任务有报错, ${url}, error: ${error && error.message || error}`);
                return { status, tab, peopleInfo, error }
            } catch (error) {
                Logger.error(`liepin 等待liepin_profile_search任务结果报错: ${url} ${error}`);
                return { status: "fail", tab, peopleInfo: null }
            }
        },

        async chat() {

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
            return { result1, result2, tab }
        }
    }
}

module.exports = ExecuteHelper.getInstance();