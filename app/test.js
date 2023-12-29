const Client = require("./Client/maimai/client.js");
const Logger = require('./Logger');

global.Logger = Logger;

let client = new Client();
client.run();