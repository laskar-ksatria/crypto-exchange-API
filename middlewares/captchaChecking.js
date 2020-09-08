const axios = require('axios');

const PRIVATE_KEY = process.env.CAPTCHA_PRIVATE_KEY;

const captchaVerify = (req,res, next) => {
    let captcha = req.body.recaptcha;
    let url = 'https://www.google.com/recaptcha/api/siteverify';

    axios({
        url:`${url}?secret=${PRIVATE_KEY}&response=${captcha}&remoteip=${req.connection.remoteAddress}`,
        method: 'POST',
    })
    .then(({data}) => {
        if (data.success) {
            next();
        }else {
            next({message: 'Captcha is not valid'});
        }
    })
};

module.exports = { captchaVerify };