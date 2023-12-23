// const http = require('http');
// const { spawn } = require('child_process');

// const Koa = require("koa");
// const KoaRouter = require('koa-router');
// const log4js = require("koa-log4");


const Common = require("./Client/common.js");

const Resume = require("./Client/maimai/resume.js");

const common = new Common();
common.initBrowser();
const page = common.newPage();
const resume = new Resume({ page, browser: common.browser, userInfo: { name: "测试名字" } });

resume.run();

console.log("end");