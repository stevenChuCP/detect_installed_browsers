let detect = require('./src/detect_windows');

detect().then(value => {
    console.log(value);
});