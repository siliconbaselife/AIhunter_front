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
        common.newPage();
    })