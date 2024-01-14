module.exports =
    `
class Testmmm extends Base {
    static instance = new Testmmm();
    static getInstance() {
        if (!Testmmm.instance) Testmmm.instance = new Testmmm();
        return Testmmm.instance;
    }


    TEST_TYPE = "testMission"; // 测试任务类型
    TEST_TYPE2 = "testMission2"; // 测试任务类型2

    /**
     * 初始化
     */
    initialize() {
        // 查看当前标签页的参数，如果有参数，则直接开启任务
        console.log("initialized1234");
        console.log("initialized");
        ContentMessageHelper.getInstance().listenFromOthers(this.TEST_TYPE, this.handleGotTabParams.bind(this));
        ContentMessageHelper.getInstance().listenFromOthers(this.TEST_TYPE2, this.handleGotTabParams2.bind(this));
    }

    /** 1. 本页是测试页 ------------------------------------------------------------------------------------------------------------------------------------- */

    /**
     * 搜索任务1
     * @param {string} keyword 搜索关键字
     */
    async handleGotTabParams(keyword) {
        console.log(keyword);
        this.keyword = keyword;
        try {
            const searchInput = await waitElement(".quickdelete-wrap input");
            const searchBtn = await waitElement("[value = '百度一下']");
            // 输入文本
            if (this.keyword) { // 输入内容
                fillTextOnInputOrTextarea(searchInput, this.keyword);
                await sleep(500);
            }
            // 点击搜索按钮
            searchBtn.click();
            await sleep(8000);
        } catch (error) {
            console.log("搜索失败", error);
        }

        return "我是完成了带的参数1";
    }


    /**
     * 搜索任务2
     * @param {string} keyword 搜索关键字
     */
    async handleGotTabParams2(keyword) {
        console.log(keyword);
        this.keyword = keyword;
        try {
            const searchInput = await waitElement(".quickdelete-wrap input");
            const searchBtn = await waitElement("[value = '百度一下']");
            // 输入文本
            if (this.keyword) { // 输入内容
                fillTextOnInputOrTextarea(searchInput, this.keyword);
                await sleep(500);
            }
            // 点击搜索按钮
            searchBtn.click();
            await sleep(8000);
        } catch (error) {
            console.log("搜索失败2", error);
        }

        return "我是完成了带的参数2";
    }
}

Testmmm.getInstance().initialize();
`