const exec = require('child_process').exec;
const browserInterface = require('./interface.js');

function installedBrowser(path) {
    browserInterface.call(this);

    this.installPath = path;
}

/**
 * Query all installed application.
 * 
 * @returns Array of installed application paths
 */
function getInstalledApps() {
    const command = 'mdfind "kMDItemContentType == \'com.apple.application-bundle\'"';

    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.split('\n'));
        });
    });
}

/**
 * 
 * @param {String} app The path of the app
 * @returns Returns the path of the app if it is a browser, else false.
 */
function filterBrowser(app) {
    const command = 'defaults read "' + app + '/Contents/Info" CFBundleURLTypes';

    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (stdout.search('http') > -1) {
                resolve(app);
                return;
            }
            resolve(false);
        });
    });
}

/**
 * 
 * @param {String} path 
 * @returns Returns a string which is the name off the app.
 */
function getName(path) {
    return path.split('/').pop().replace('.app', '');
}

/**
 * 
 * @param {String} path 
 * @returns Returns string which is the version off the app.
 */
function getVersion(path) {
    const command = 'defaults read "' + path + '/Contents/Info" CFBundleShortVersionString';

    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

module.exports = function() {
    return getInstalledApps().then(apps => {
        let foundBrowser = [];
        let promises = [];
        apps.forEach(app => {
            let p = filterBrowser(app).then(result => {
                if(result != false) {
                    foundBrowser.push(new installedBrowser(result));
                }
                return Promise.resolve();
            });
            promises.push(p);
        });
        return Promise.all(promises).then(() => {
            return Promise.resolve(foundBrowser);
        })
    }).then(browsers => {
        let promises = []
        browsers.forEach(browser => {
            browser.name = getName(browser.installPath);
            let p = getVersion(browser.installPath).then(version => {
                browser.version = version;
            });
            promises.push(p);
        });
        return Promise.all(promises).then(() => {
            return Promise.resolve(browsers);
        });
    })
    .catch(error => {
        console.error(error);
    })
};