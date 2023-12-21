var fs = require('fs');
const Logger = require('../../Logger');

const rmDir = async(path) => {
  var files = [];
  if(fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach(function(file, index) {
      var curPath = path + "/" + file;
      fs.unlinkSync(curPath);
    });
    fs.rmdirSync(path);
  }
};

module.exports = {
    rmDir: rmDir
};