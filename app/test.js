// const Client = require("./Client/maimai/client.js");
// const Logger = require('./Logger');

// global.Logger = Logger;

// let client = new Client();
// client.run();






// 测试通过扩展程序新建页面, 每5秒创建一个
const Common = require("./Client/common");
const { sleep } = require("./utils");
const ExecuteHelper = require("./Extension/execute");
const TabHelper = require("./Extension/Tab");
const common = new Common();
common.initBrowser()
    .then(async () => {
        common.newPage();
        await sleep(5 * 1000);
    })
    .then(async () => {
        const {tab, result1, result2} = await ExecuteHelper.test.search2("https://www.baidu.com", "关键词123");
        console.log(result1, result2);
        TabHelper.closeTab(tab.id) // 随时可以关闭标签页，只要有标签页id
    })
    .then(async () => {
        await sleep(9999 * 1000);
        common.newPage();
    })