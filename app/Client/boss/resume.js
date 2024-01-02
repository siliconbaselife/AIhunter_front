const Base = require('./base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");

class Resume extends Base {
    keywordDelay = 40;
    peopleCache;
    getList;

    constructor(options) {
        super(options)
    }
}

module.exports = Resume;