// const http = require('http');
// const { spawn } = require('child_process');

// const Koa = require("koa");
// const KoaRouter = require('koa-router');
// const log4js = require("koa-log4");


// const Common = require("./Client/common.js");

const Client = require("./Client/maimai/client.js");

let client = new Client();
client.run();


console.log("end");