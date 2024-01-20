const path = require("path");
const fs = require("fs");


const pluginUtils = require("./plugin/utils/index");

const contentMessageHelper = require("./plugin/helper/message-helper/content");
const contentUtils = require("./plugin/content/main/utils");
const contentTabHelper = require("./plugin/helper/tab-helper/content");
const contentLinkedinBase = require("./plugin/content/main/execution/linkedin/base");
const contentLinkedinChat = require("./plugin/content/main/execution/linkedin/linkedinChat");
const contentLinkedinPerson = require("./plugin/content/main/execution/linkedin/linkedinPerson");
const contentLinkedin = require("./plugin/content/main/execution/linkedin");

const contentLiePinProfile = require("./plugin/content/main/execution/liepin/liepinProfile");
const contentLiePin = require("./plugin/content/main/execution/liepin");

const backgroundMessageHelper = require("./plugin/helper/message-helper/background");

const resume = require("./plugin/content/main/execution/linkedin/resume")

// 测试代码
const testMission = require("./plugin/content/main/execution/test");



const TabHelper = require("./Tab");

class ExtensionHelper {
    /** @type {ExtensionHelper} */
    static instance;
    /*** @returns {ExtensionHelper} */
    static getInstance() {
        if (!ExtensionHelper.instance) ExtensionHelper.instance = new ExtensionHelper();
        return ExtensionHelper.instance;
    }

    /** @type {import("puppeteer").WebWorker} 扩展程序WebWorker实例 */
    extension;

    /** @type {TabHelper} 标签页管理 */
    tabHelper = TabHelper;

    /** @readonly 扩展程序路径 这个文件夹必须是在程序执行的目录下 */
    EXTENSION_PATH = path.join(process.cwd(), "extension");
    /** @readonly 扩展程序content.js文件 */
    CONTENT_JS_NAME = "content.js";
    /** @readonly 扩展程序content.js内容 */
    CONTENT_JS = `
        ${pluginUtils}
        ${contentMessageHelper}
        ${contentUtils}
        ${contentTabHelper}
        ${contentLinkedinBase}
        ${contentLinkedinChat}
        ${contentLinkedinPerson}
        ${resume}
        ${contentLinkedin}
        ${contentLiePinProfile}
        ${contentLiePin}
        ${testMission}
    `;
    /** @readonly background文件名 */
    BACKGROUND_JS_NAME = "background.js";
    /** @readonly background内容 */
    BACKGROUND_JS = `
        // Background.js
        ${backgroundMessageHelper}
    `;
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
                  "service_worker": "${this.BACKGROUND_JS_NAME}",
                  "type": "module"
              },
              "content_scripts": [
                {
                    "matches": [
                        "https://*.maimai.cn/*",
                        "https://*.linkedin.com/*",
                        "https://*.liepin.com/*"
                    ],
                    "js": [
                        "${this.CONTENT_JS_NAME}"
                    ],
                    "run_at": "document_start"
                },
                {
                    "matches": [
                        "https://*.baidu.com/*"
                    ],
                    "js": [
                        "${this.CONTENT_JS_NAME}"
                    ],
                    "run_at": "document_start"
                }
              ],
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

    constructor() {
        this.initialize();
    }

    initialize() {
        // 如果当前目录不存在扩展程序目录，则创建
        if (!fs.existsSync(this.EXTENSION_PATH)) {
            fs.mkdirSync(this.EXTENSION_PATH);
        }
        // 如果扩展目录不存在manifest.json则创建
        let manifestJsonPath = `${this.EXTENSION_PATH}/${this.MANIFEST_JSON_NAME}`;
        if (fs.existsSync(manifestJsonPath)) fs.rmSync(manifestJsonPath);
        fs.appendFileSync(manifestJsonPath, this.MANIFEST_JSON);
        let backgroundJsPath = `${this.EXTENSION_PATH}/${this.BACKGROUND_JS_NAME}`;
        if (fs.existsSync(backgroundJsPath)) fs.rmSync(backgroundJsPath);
        fs.appendFileSync(backgroundJsPath, this.BACKGROUND_JS);
        let contentJsPath = `${this.EXTENSION_PATH}/${this.CONTENT_JS_NAME}`;
        if (fs.existsSync(contentJsPath)) fs.rmSync(contentJsPath);
        fs.appendFileSync(contentJsPath, this.CONTENT_JS);
    }

    /** 
     * 拿到扩展程序操作
     * @param {import("puppeteer").WebWorker} extension 扩展程序WebWorker实例
     */
    initializeWithExtension(extension) {
        this.extension = extension;
        this.tabHelper.extension = extension;
    }
}

module.exports = ExtensionHelper.getInstance();