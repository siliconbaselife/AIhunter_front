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
     * @returns {{user_name: string, email: string}}
     */
    getUserInfo(user_name) {
        if (user_name) {
            LocalStorage.get()
        }
    }

    /**
     * 保存用户信息
     * @param {{user_name: string, email: string}} param0 
     */
    setUserInfo({ user_name, email }) {
        if (!user_name) throw new Error("保存用户信息失败, 没有user_name");
        const userInfo = { email, user_name };
        LocalStorage.set(LOCAL_STORAGE_CONSTANTS.USER_NAME_KEY, userInfo);
        this.userInfo = userInfo;
    }


}

module.exports = UserManager.getInstance();