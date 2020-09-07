const { verifyToken } = require('../helpers/jwt');

const userAuthentication = (req,res,next) => {
    if (req.headers.jwttoken) {
        req.decoded = verifyToken(req.headers.jwttoken)
        next();
    }else {
        next({message: "You must login first as user"})
    }
};

const userAuthCookie = (req,res,next) => {
    if (req.cookies) {
        console.log("Masuk use auth")
        let decoded = verifyToken(req.cookies.exchangetoken)
        req.decoded = decoded
        next();
    }else {
        next({message: "You must login first as user"})
    };
};

module.exports = { userAuthentication, userAuthCookie }