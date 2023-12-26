const fs = require('fs');

// 遍历此文件夹里的js文件, 加载所有中间件
const useRoutes = (app) => {
    fs.readdirSync(__dirname).forEach(file => {
        if (file === 'index.js') return // index.js文件不需要
        const middleware = require(`./${file}`)
        app.use(middleware);
    })
}

module.exports = useRoutes;