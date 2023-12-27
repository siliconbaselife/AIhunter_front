const Base = require('./Base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");

class Recall extends Search {
    keywordDelay = 40;

    constructor(options) {
        super(options)
    }
}