let detect = require('./src/detect_windows');

detect((err, res) => {
    if (err) {
        console.log(err);
    }
    console.log(res);
});