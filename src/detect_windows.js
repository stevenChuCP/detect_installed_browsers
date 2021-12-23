const util = require('util');
// const exec = util.promisify(require('child_process').exec);
const exec = require('child_process').exec;

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

function getBrowserPathFromRegKey(regKey) {
    let registryQuery = regKey + '\\shell\\open\\command';
    let command = 'reg query ' + registryQuery + ' /t REG_SZ';

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
    
            let split = stdout.split('"');
            resolve(split[1]);
        });
    });
}

module.exports = function (callback) {

    getInstalledBrowsersRegKey()
    .then(browsers => {
        let foundBrowser = [];
        browsers.forEach(browser => {
            foundBrowser.push(new installedBrowser(getBrowserNameFromRegKey(browser)));
        });
        return Promise.resolve(foundBrowser);
    }).then(browsers => {
        browsers.forEach(browser => {
            browser.installPath = getBrowserPathFromRegKey(browser);
        });
        console.log(browsers);
    });
    // getInstalledBrowsersRegKey((err, resp) => {
    //     if(err) {
    //         return callback(err, null);
    //     }
    //     installedBrowser = resp;
    //     console.log(installedBrowser);
    // });

    // console.log(installedBrowser);

    // let registryQuery = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Clients\\StartMenuInternet';
    // // var command = 'reg query ' + registryQuery + ' | findstr "ProgId"';
    // let command = 'reg query ' + registryQuery;

    // exec(command, function (err, stdout, stderr) {
    //     let value;
    //     // parse the output which is sth like this (Windows 10):
    //     //   "    ProgId    REG_SZ    ChromeHTML\r\n"
    //     if (err) {
    //         console.log(err);
    //         if (stderr.length > 0) {
    //             return callback('Unable to execute the query: ' + err);
    //         } else {
    //             // findstr failed due to not finding match => key is empty, default browser is IE
    //             value = 'iexplore.exe';
    //         }
    //     }

    //     let browserKey = stdout.split('\r\n').slice(4, -1);
    //     let foundBrowsers = [];
    //     browserKey.forEach((value) => {
    //         let _browser = new installedBrowser();
    //         _browser.name = getBrowserNameFromRegKey(value);
    //         _browser.regKey = value;
    //         foundBrowsers.push(_browser);
    //     });
        
    //     // console.log(getBrowserPathFromRegKey(foundBrowsers[0].regKey));
    //     foundBrowsers.forEach((browser) => {
    //         getBrowserPathFromRegKey(browser.regKey, (err, resp) => {
    //             browser.installPath = resp;
    //         });
    //     })
    //     // getBrowserPathFromRegKey(foundBrowsers[0].regKey, (err, resp) => {
    //     //     console.log("Response", resp);
    //     // });
    //     console.log(foundBrowsers);

    //     // if (!value) {
    //     //     // merge multiple spaces to one
    //     //     stdout = stdout.trim().replace(/\s\s+/g, ' ');
    //     //     var split = stdout.split(' ');
    //     //     // need third substr, stdout is of this form: "    ProgId    REG_SZ    ChromeHTML\r\n"
    //     //     value = split[2].toLowerCase();
    //     // }

    //     // var out = {
    //     //     isEdge:     value.indexOf('msedge') > -1,       // MSEdgeHTM
    //     //     isIE:       value.indexOf('ie.http') > -1,      // IE.HTTP
    //     //     isSafari:   value.indexOf('safari') > -1,       // SafariURL
    //     //     isFirefox:  value.indexOf('firefox') > -1,      // FirefoxURL
    //     //     isChrome:   value.indexOf('chrome') > -1,       // ChromeHTML
    //     //     isChromium: value.indexOf('chromium') > -1,     
    //     //     isOpera:    value.indexOf('opera') > -1,        // OperaHTML
    //     //     identity:   value
    //     // };
    //     // out.isBlink = (out.isChrome || out.isChromium || out.isOpera);
    //     // out.isWebkit = (out.isSafari || out.isBlink);
    //     // out.commonName = require('./common-name')(out);

    //     // callback(null, out);

    //     // console.log(stdout);
    // });
};
