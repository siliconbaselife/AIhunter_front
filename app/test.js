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
        const { page, tab } = await common.createNewTabViaExt({ url: "https://www.linkedin.com/", active: false, selected: false });
        console.log("page", page, "tab", tab);
        await page.evaluate(() => {
            const a = document.querySelector(`[data-tracking-control-name="homepage-basic_sign-in-submit-btn"]`);
            console.log("a", a)
            a.click();
        })
    })
    .then(async () => {
        await sleep(200 * 1000);
        const { page, tab } = await common.createNewTabViaExt({ url: "https://www.baidu.com", active: false, selected: false });
        console.log("page", page, "tab", tab);
    })
    .then(async () => {
        await sleep(200 * 1000);
        const { page, tab } = await common.createNewTabViaExt({ url: "https://www.baidu.com", active: false, selected: false });
        console.log("page", page, "tab", tab);
    })