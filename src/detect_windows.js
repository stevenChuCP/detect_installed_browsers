const util = require('util');
const exec = require('child_process').exec;
const vi = require('win-version-info');

class installedBrowser {
    constructor(browserName){
        this.name = browserName;
        this.installPath = "";
        this.regKey = "";
        this.version = "";
    }
}

/**
 * Find installed browsers from registry key.
 * 
 * @returns {Promise} Returns an array of installed browser registry key if promise resolve.
 */
function getInstalledBrowsersRegKey() {
    let registryQuery = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Clients\\StartMenuInternet';
    let command = 'reg query ' + registryQuery;

    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            
            // parse the output which is sth like this (Windows 10):
            /**
             * HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Clients\StartMenuInternet
             *     (Default)    REG_SZ    IEXPLORE.EXE
             *
             * HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Clients\StartMenuInternet\Firefox-308046B0AF4A39CB
             * HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Clients\StartMenuInternet\Google Chrome
             * HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Clients\StartMenuInternet\IEXPLORE.EXE
             * HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Clients\StartMenuInternet\Microsoft Edge
             */
            resolve(stdout.split('\r\n').slice(4, -1));
        });
    });
}

/**
 * Get the browser's official name from registry key.
 * 
 * @param {String} regKey 
 * @returns Return the official name of the input registry key.
 */
function getBrowserNameFromRegKey(regKey) {
    let value = regKey.split('\\').at(-1).toLowerCase();
    let name = '';

    if(value.indexOf('firefox') != -1) name = 'Mozilla Firefox';
    else if(value.indexOf('google chrome') != -1) name = "Google Chrome";
    else if(value.indexOf('iexplore') != -1) name = "Internet Explorer";
    else if(value.indexOf('microsoft edge') != -1) name = "Microsoft Edge";
    else name = value;

    return name;
}

/**
 * 
 * @param {String} regKey 
 * @returns Returns a string indicating the install path of the browser if promise resolve.
 */
function getBrowserPathFromRegKey(regKey) {
    let registryQuery = regKey + '\\shell\\open\\command';
    let command = 'reg query "' + registryQuery + '" /t REG_SZ';

    return new Promise((resolve, reject) => {
        exec(command, function (error, stdout, stderr) {
            // parse the output which is sth like this (Windows 10):
            /**
             * 
             * HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Clients\StartMenuInternet\Google Chrome\shell\open\command
             *     (Default)    REG_SZ    "C:\Program Files\Google\Chrome\Application\chrome.exe"
             * 
             * End of search: 1 match(es) found.
             */
            if (error) {
                reject(error);
                return;
            }
            
            let path = stdout.split('"')[1];

            // IE don't have double quotes for its path.
            //    (Default)    REG_SZ    C:\Program Files\Internet Explorer\iexplore.exe
            if(path === undefined) {
                let line = stdout.split('\r\n');
                line = line[2].trim().replace(/\s\s+/g, ' ');
                let index = line.indexOf('C:');
                path = line.substr(index);
            }
            resolve(path);
        });
    });
}

module.exports = function () {

    return getInstalledBrowsersRegKey()
    .then(browsers => {
        let foundBrowser = [];
        browsers.forEach(browserRegKey => {
            let _browser = new installedBrowser(getBrowserNameFromRegKey(browserRegKey));
            _browser.regKey = browserRegKey;
            foundBrowser.push(_browser);
        });
        return Promise.resolve(foundBrowser);
    }).then(browsers => {
        let promises = [];
        browsers.forEach(browser => {
            let p = getBrowserPathFromRegKey(browser.regKey).then(value => {
                browser.installPath = value;
                // console.log(browser.installPath);
                return Promise.resolve();
            });
            promises.push(p);
        });
        return Promise.all(promises).then(() => {
            return Promise.resolve(browsers);
        })
    }).then(browsers => {
        browsers.forEach(browser => {
            let fileInfo = vi(browser.installPath);
            browser.version = fileInfo.FileVersion;
        });
        return Promise.resolve(browsers);
    }).catch(error => {
        console.error(error);
    });
};
