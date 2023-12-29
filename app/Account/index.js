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
     * @returns {{account_id: string, email: string} | null}
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
     * @param {{account_id: string, account_info: any}} param0 账号信息
     */
    setAccountInfo({ account_id, account_info }) {
        if (!account_id) throw new Error("保存账号信息失败, 没有account_id");
        // 获取储存的用户信息，以account_id为key, 将账号信息set进去
        const storedAccountInfo = LocalStorage.get(LOCAL_STORAGE_CONSTANTS.ACCOUNT_INFO_KEY) || {};
        storedAccountInfo[account_id] = account_info;
        LocalStorage.set(LOCAL_STORAGE_CONSTANTS.ACCOUNT_INFO_KEY, storedAccountInfo);
    }
}

module.exports = AccountManager.getInstance();