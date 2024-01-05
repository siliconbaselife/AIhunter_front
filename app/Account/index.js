const LocalStorage = require("../utils/LocalStorage/index");
const { LOCAL_STORAGE_CONSTANTS } = require("../Config/index");
class AccountManager {
    static instance;
    /**
     * 获取实例(单例)
     * @returns {AccountManager}
     */
    static getInstance() {
        if (!AccountManager.instance) AccountManager.instance = new AccountManager();
        return AccountManager.instance;
    }

    /**
     * 获取账号信息
     * @param {string} account_id 账号id
     * @returns {{account_id: string, email: string, cookies: import("puppeteer".Protocol.Network.Cookie[] | undefined)} | null}
     */
    getAccountInfo(account_id) {
        if (account_id) {
            const storedAccountInfo = LocalStorage.get(LOCAL_STORAGE_CONSTANTS.ACCOUNT_INFO_KEY) || {};
            return storedAccountInfo[account_id] || null;
        }
        return null;
    }

    /**
     * 保存账号信息
     * @param {string} account_id 账号id
     * @param {any} account_info 账号信息
     * @param {?import("puppeteer").Page} page 当前页面(如果传递了此参数，则会同时保存该页面上的cookies)
     */
    async setAccountInfo(account_id, account_info, page) {
        if (!account_id) throw new Error("保存账号信息失败, 没有account_id");
        let cookies;
        if (page) { cookies = await page.cookies(); }
        // 获取储存的用户信息，以account_id为key, 将账号信息set进去
        const storedAccountInfo = LocalStorage.get(LOCAL_STORAGE_CONSTANTS.ACCOUNT_INFO_KEY) || {};
        account_info.cookies = cookies;
        storedAccountInfo[account_id] = account_info;
        LocalStorage.set(LOCAL_STORAGE_CONSTANTS.ACCOUNT_INFO_KEY, storedAccountInfo);
    }

    /**
     * 在指定页面set cookie
     * @param {import("puppeteer").Page} page 页面
     * @param  {string | import("puppeteer").Protocol.Network.CookieParam[]} accountIdOrCookies 账号id 或者 指定cookies 
     * @returns {Promise<boolean>}
     */
    setCookies = async (page, accountIdOrCookies) => {
        let cookies;
        if (typeof accountIdOrCookies === "string") { // 传了账号id
            let accountInfo = this.getAccountInfo(accountIdOrCookies);
            if (accountInfo && accountInfo.cookies) cookies = accountInfo.cookies;
            else return false;
        } else {
            cookies = accountIdOrCookies;
        }
        console.log("cookies", cookies);
        await page.setCookie(...cookies);
        return true
    }

    /**
     * 删除当前页面cookies
     * @param {import("puppeteer").Page} page 页面 
     * @param { {all?: boolean} | {cookies?: import("puppeteer").Protocol.Network.DeleteCookiesRequest[]} | {account_id?: string, deleteStorageToo?: boolean} } options 选项
     */
    removeCookies = async (page, options) => {
        let cookies;
        if (options.account_id) { // 删除本页面 指定账号id的cookies
            let accountInfo = this.getAccountInfo(options.account_id);
            if (!(accountInfo && accountInfo.cookies)) return false;
            cookies = accountInfo.cookies;
            if (options.deleteStorageToo) { // 同时删除账号本地储存的cookies
                delete accountInfo.cookies;
                this.setAccountInfo(options.account_id, accountInfo);
            }
        } else if (options.cookies) { // 删除本页面指定cookies
            cookies = options.cookies;
        } else if (options.all) { // 删除本页面的所有cookies
            cookies = await page.cookies();
        }
        await page.deleteCookie(cookies);
        return true;
    }
}

module.exports = AccountManager.getInstance();