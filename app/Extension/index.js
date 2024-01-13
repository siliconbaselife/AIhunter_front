const path = require("path");
const fs = require("fs");

class ExtensionHelper {
    /** @type {ExtensionHelper} */
    static instance;
    /*** @returns {ExtensionHelper} */
    static getInstance() {
        if (!ExtensionHelper.instance) ExtensionHelper.instance = new ExtensionHelper();
        return ExtensionHelper.instance;
    }

    /** @readonly 扩展程序路径 这个文件夹必须是在程序执行的目录下 */
    EXTENSION_PATH = path.join(process.cwd(), "extension/plugin");

    constructor() {
        this.initialize();
    }

    initialize() {

    }
}

module.exports = ExtensionHelper.getInstance();