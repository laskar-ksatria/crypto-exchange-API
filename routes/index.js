const express = require('express');
const Router = express.Router();
const csurf = require('csurf');
//Controller
const UserController = require('../controllers/userController');
const AccountController = require('../controllers/accountController');
const TradeController = require('../controllers/tradeController');
const CryptoController = require('../controllers/cryptoController');
//middleware
const { userAuthentication, userAuthCookie } = require('../middlewares/auth');
const { captchaVerify } = require('../middlewares/captchaChecking');
const csurfProtection = csurf({ cookie: true, ignoreMethods: ['POST'] });
const { cryptoCache } = require('../middlewares/redis')


//-------------------- X -------------------------- ROUTER ---------------------------- X --------------------------//
//User
Router.get('/users', UserController.readAll);
Router.get('/users/myauth', csurfProtection,userAuthCookie, UserController.readMe);
Router.post('/users', captchaVerify,UserController.create);
Router.post('/users/login', csurfProtection,UserController.login);
Router.get('/users/logout', csurfProtection,userAuthCookie,UserController.logout);
Router.get('/users/checkauth',csurfProtection,userAuthCookie,UserController.checkAuth);

//Account
Router.get('/accounts',AccountController.readAll);
Router.get('/myAccount', csurfProtection,userAuthCookie, AccountController.readMyAccount);
Router.get('/account',userAuthCookie,csurfProtection, AccountController.createAccount);

//LimitTrade
Router.get('/trade/limit', TradeController.readAllLimit);
Router.post('/trade/limit/buy', csurfProtection,userAuthCookie, TradeController.createBuyLimit, TradeController.checkBuyLimit)
Router.post('/trade/limit/sell', csurfProtection,userAuthCookie, TradeController.createSellLimit, TradeController.checkSellLimit)
Router.get('/trade/limit/myLimitTrade', csurfProtection,userAuthCookie, TradeController.readMyLimit);
Router.delete('/trade/limit/:limitId', csurfProtection,userAuthCookie, TradeController.deleteLimit)

//MarketTrade
Router.get('/trade/market', TradeController.readAllMarket);
Router.post('/trade/market/buy', csurfProtection, userAuthCookie, TradeController.createBuyMarket);
Router.post('/trade/limit/sell', csurfProtection, userAuthCookie, TradeController.createSellMarket);

//Crypto
Router.get('/cryptoprice', csurfProtection, userAuthCookie,CryptoController.getCryptoData);
//Demo
Router.get('/cryptoData', cryptoCache,CryptoController.getCryptoData);







//--------------------------------------------- SANDBOX ----------------------------------------------------->
const Account = require('../models/account');
const User = require('../models/user');
const LimitTrade = require('../models/limitTrade');

function RedisCache(client, cb) {
    client.get('laskar', function (err, data) {
        if (err) {
            throw err;
        }else {
            cb(data);
        }
    })
};

function cache(req,res,next) {
    let client = req.redisClient;
    RedisCache(client, function (data) {
        if (data) {
            console.log("MASUK DATA")
            res.json(JSON.parse(data));
        }else {
            console.log("Masuk next")
            next();
        }
    })
};




Router.get('/redis-test', cache, (req,res,next) => {
    let client = req.redisClient;
    User.find({})
        .then(users => {
            let message = {message: "Hallo"}
            client.SETEX('laskar', 3600, JSON.stringify(users))
            res.json(message)
        })
})


Router.get('/check-lt', (req,res,next) => {
    let price = 1
    LimitTrade.find({price: {$gte: price}}).sort({price: 'desc'})
        .then(trades => {
            res.json(trades);
        })
})


Router.get('/delete-account', (req,res,next) => {
    Account.deleteOne({_id: '5f38f3ffa2207a09dc84caea'})
        .then(() => res.send("Oke"))
})

Router.get('/delete-limit', (req,res,next) => {
    LimitTrade.deleteMany({}).then(() => {
        res.send("oke")
    })
})

Router.get('/delete-all-user', (req,res,next) => {
    User.deleteMany({}).then(() => res.json({message: "Oke"}))
})
Router.get('/inject', (req,res,next) => {
    let data = {full_name: "Laskar Ksatria S", email: "laskar@mail.com", password: "123321", confirm_password: "123321"}
    User.create(data).then(user => res.status(200).json(user)).catch(err => res.json({message: err.message}))
})
//SANDBOX
Router.get('/sandbox', (req,res,next) => {
    let email = "laskar@mail.com";
    let newArr = [1,2,3,4,5,6];
    for (let i = 0; i < newArr.length; i++) {
        User.findOne({email})
            .then(user => {
                console.log(user.full_name);
            })
            .catch(err => console.log(err))
            continue;
    };
    res.send("Oke")
})



module.exports = Router;