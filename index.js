var detect;
const os = require('os');

if (os.platform() == 'win32') {
    detect = require('./src/detect_windows');
} else if(os.platform() == 'darwin') {
    detect = require('./src/detect_mac');
} else {
    detect = function () {
        return Promise.reject("Not supported yet");
    }
}

module.exports = detect;