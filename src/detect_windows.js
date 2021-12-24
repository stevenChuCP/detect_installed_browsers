const exec = require('child_process').exec;
const browserInterface = require('./interface.js');

function installedBrowser(name) {
    browserInterface.call(this);

    this.name = name;
}

function getInstalledBrowserBrowserRegKeyArch(registryQuery) {
    let command = 'reg query ' + registryQuery;

    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            
            // parse the output which is sth like this (Windows 10):
            // (For x64 computer the arch value is WOW6432Node, x86 is empty)
            /**
             * HKEY_LOCAL_MACHINE\SOFTWARE\${arch}\Clients\StartMenuInternet
             *     (Default)    REG_SZ    IEXPLORE.EXE
             *
             * HKEY_LOCAL_MACHINE\SOFTWARE\${arch}\Clients\StartMenuInternet\Firefox-308046B0AF4A39CB
             * HKEY_LOCAL_MACHINE\SOFTWARE\${arch}\Clients\StartMenuInternet\Google Chrome
             * HKEY_LOCAL_MACHINE\SOFTWARE\${arch}\Clients\StartMenuInternet\IEXPLORE.EXE
             * HKEY_LOCAL_MACHINE\SOFTWARE\${arch}\Clients\StartMenuInternet\Microsoft Edge
             */
            resolve(stdout.split('\r\n').slice(4, -1));
        });
    });
}

/**
 * Find installed browsers from registry key.
 * 
 * @returns {Promise} Returns an array of installed browser registry key if promise resolve.
 */
function getInstalledBrowsersRegKey() {
    const regQuery64 = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Clients\\StartMenuInternet';
    const regQuery32 = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Clients\\StartMenuInternet';

    return getInstalledBrowserBrowserRegKeyArch(regQuery64).catch(error => {
        return getInstalledBrowserBrowserRegKeyArch(regQuery32);
    }).then(value => {
        return Promise.resolve(value);
    }).catch(error => {
        console.error(error);
    });
}

/**
 * Get the browser's official name from registry key.
 * 
 * @param {String} regKey 
 * @returns Return the official name of the input registry key.
 */
function getBrowserNameFromRegKey(regKey) {
    let lastValue = regKey.split('\\').pop();
    let value = lastValue.toLowerCase();
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

function getVersionFromPath(path) {
    let command = 'wmic datafile where name="' + path.replace(/\\/g, "\\\\") + '" get version';

    return new Promise((resolve, reject) => {
        exec(command, function (error, stdout, stderr) {
            // parse the output which is sth like this (Windows 10):
            /**
             * Version
             * 96.0.4664.110
             *
             *
             */
            if (error) {
                reject(error);
                return;
            }
            
            // Split the newline and trim out the excessive space
            let version = stdout.split('\r\r\n')[1].trim().replace(/\s\s+/g, ' ');
            resolve(version);
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
                return Promise.resolve();
            });
            promises.push(p);
        });
        return Promise.all(promises).then(() => {
            return Promise.resolve(browsers);
        })
    }).then(browsers => {
        let promises = [];
        browsers.forEach(browser => {
            let p = getVersionFromPath(browser.installPath).then(value => {
                browser.version = value;
                return Promise.resolve();
            });
            promises.push(p);
        });
        return Promise.all(promises).then(() => {
            browsers.forEach(browser => {
                delete browser.regKey;
            })
            return Promise.resolve(browsers);
        });
    }).catch(error => {
        console.error(error);
    });
};
