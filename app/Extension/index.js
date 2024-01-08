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
    EXTENSION_PATH = path.join(process.cwd(), "extension");
    /** @readonly 扩展程序json配置文件 */
    MANIFEST_JSON_NAME = "manifest.json";
    /** @readonly 扩展程序json内容 */
    MANIFEST_JSON = `
        {
          "manifest_version": 3,
          "name": "AIhunter",
          "description": "AIhunter",
          "version": "1.0",
          "author": "lewis",
          "background": {
              "service_worker": "background.js",
              "type": "module"
          },
          "host_permissions": [
              "*://*/*",
              "http://*/*",
              "https://*/*",
              "<all_urls>"
          ],
          "permissions": [
              "tabs",
              "storage",
              "activeTab",
              "scripting",
              "webRequest",
              "cookies"
          ]
        }
    `;
    /** @readonly background文件名 */
    BACKGROUND_JS_NAME = "background.js";
    /** @readonly background内容 */
    BACKGROUND_JS = `
        console.log("manifest start");
    `;

    constructor() {
        console.log("init");
        this.initialize();
    }

    initialize() {
        // 如果当前目录不存在扩展程序目录，则创建
        if (!fs.existsSync(this.EXTENSION_PATH)) {
            fs.mkdirSync(this.EXTENSION_PATH);
        }
        // 如果扩展目录不存在background.js则创建
        let manifestJsonPath = `${this.EXTENSION_PATH}/${this.MANIFEST_JSON_NAME}`;
        if (!fs.existsSync(manifestJsonPath)) {
            fs.appendFileSync(manifestJsonPath, this.MANIFEST_JSON);
        }
        let backgroundJsPath = `${this.EXTENSION_PATH}/${this.BACKGROUND_JS_NAME}`;
        if (!fs.existsSync(backgroundJsPath)) { // 如果扩展目录不存在background.js则创建
            fs.appendFileSync(backgroundJsPath, this.BACKGROUND_JS);
        }
    }
}

module.exports = ExtensionHelper.getInstance();