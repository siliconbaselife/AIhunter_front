// const Client = require("./Client/maimai/client.js");
// const Logger = require('./Logger');

// global.Logger = Logger;

// let client = new Client();
// client.run();





// 测试通过扩展程序新建页面, 每5秒创建一个
const Common = require("./Client/common");
const { sleep } = require("./utils");
const common = new Common();
common.initBrowser()
    .then(async () => {
        const { page, tab } = await common.createNewTabViaExt({ url: "https://www.baidu.com", active: false, selected: false });
        console.log("page", page, "tab", tab);
    })
    .then(async () => {
        await sleep(5 * 1000);
        const { page, tab } = await common.createNewTabViaExt({ url: "https://www.baidu.com", active: false, selected: false });
        console.log("page", page, "tab", tab);
        // 新建一个"new"浏览器
        const common2 = new Common();
        common2.initBrowser({
            headless: "new", 
            width: 1580,
            height: 900,
        });
        common2.newPage();
    })
    .then(async () => {
        await sleep(5 * 1000);
        const { page, tab } = await common.createNewTabViaExt({ url: "https://www.baidu.com", active: false, selected: false });
        console.log("page", page, "tab", tab);
    })
    .then(async () => {
        await sleep(5 * 1000);
        const { page, tab } = await common.createNewTabViaExt({ url: "https://www.baidu.com", active: false, selected: false });
        console.log("page", page, "tab", tab);
    })
    .then(async () => {
        await sleep(5 * 1000);
        const { page, tab } = await common.createNewTabViaExt({ url: "https://www.baidu.com", active: false, selected: false });
        console.log("page", page, "tab", tab);
    })
    .then(async () => {
        await sleep(5 * 1000);
        const { page, tab } = await common.createNewTabViaExt({ url: "https://www.baidu.com", active: false, selected: false });
        console.log("page", page, "tab", tab);
    })