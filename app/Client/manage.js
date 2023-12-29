class Manage {
    static instance;

    static getInstance() {
        if (!Manage.instance) Manage.instance = new Manage();
        return Manage.instance;
    }


    register = () => {

    }

    execute = () => {
        
    }
}


module.exports = Manage.getInstance();

