const LocalStorage = require("../utils/LocalStorage/index");
const { LOCAL_STORAGE_CONSTANTS } = require("../Config/index");
class UserManager {
    static instance;
    /**
     * 获取实例(单例)
     * @returns {UserManager}
     */
    static getInstance() {
        if (!UserManager.instance) UserManager.instance = new UserManager();
        return UserManager.instance;
    }

    /**
     * 获取用户信息
     * @param {?string} user_name 用户token(如果不传, 则是获取当前用户信息)
     * @returns {{user_name: string, email: string} | null}
     */
    getUserInfo(user_name) {
        if (user_name) {
            const storedUserInfo = LocalStorage.get(LOCAL_STORAGE_CONSTANTS.USER_INFO_KEY) || {};
            return storedUserInfo[user_name] || null;
        }
        return this.userInfo || null;
    }

    /**
     * 保存用户信息
     * @param {{user_name: string, email: string}} param0 用户信息
     */
    setUserInfo({ user_name, email }) {
        if (!user_name) throw new Error("保存用户信息失败, 没有user_name");
        const userInfo = { email, user_name };
        // 获取储存的用户信息，以user_name为key, 将用户信息set进去
        const storedUserInfo = LocalStorage.get(LOCAL_STORAGE_CONSTANTS.USER_INFO_KEY) || {};
        storedUserInfo[user_name] = userInfo;
        LocalStorage.set(LOCAL_STORAGE_CONSTANTS.USER_INFO_KEY, storedUserInfo);
        // 保存为当前用户信息
        this.userInfo = userInfo;
    }


}

module.exports = UserManager.getInstance();