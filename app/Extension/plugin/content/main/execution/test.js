module.exports =
    `
class Testmmm extends Base {
    static instance = new Testmmm();
    static getInstance() {
        if (!Testmmm.instance) Testmmm.instance = new Testmmm();
        return Testmmm.instance;
    }


    TEST_TYPE = "testMission"; // 测试任务类型

    /**
     * 初始化
     */
    initialize() {
        // 查看当前标签页的参数，如果有参数，则直接开启任务
        console.log("initialized1234");
        TabHelper.getInstance().getCurrentTabParams().then((args) => this.handleGotTabParams.apply(this, args));
        console.log("initialized");
    }

    /** 1. 本页是测试页 ------------------------------------------------------------------------------------------------------------------------------------- */

    /**
     * 读取进来参数, 给本页的一个人打招呼
     * @param {string} type 进来类型
     * @param {string} keyword 消息模板 
     */
    async handleGotTabParams(type, keyword) {
        console.log(type, keyword);
        this.keyword = keyword;
        console.log("type", this.TEST_TYPE);
        if (type === this.TEST_TYPE) { // 是自动打招呼类型
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
                // 标记已成功
                TabHelper.getInstance().markExecuteStatus("success", {hello: "我是成功带的参数1", nihao: "我是成功带的参数2"});
            } catch (error) {
                // 标记失败，带去错误信息
                console.log("给当前人员打招呼失败", error);
                TabHelper.getInstance().markExecuteStatus("fail", error);
                // 叫background上传记录 // 暂时不用报告失败情况
            }
        }
    }
}

Testmmm.getInstance().initialize();
`