class Manage {
    static instance;

    static getInstance() {
        if (!Manage.instance) Manage.instance = new Manage();
        return Manage.instance;
    }


    register = async(platformType, account_name, callback) => {

    }

    execute = async(platformType, account_name, account_id) => {

    }
}


module.exports = Manage.getInstance();

