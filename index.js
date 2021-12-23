var detect;
const os = require('os');

if (os.platform() == 'win32') {
    detect = require('./src/detect_windows');
} else {
    detect = new Promise((resolve, reject) => {
        reject("Not supported yet");
    });
}

module.exports = detect;