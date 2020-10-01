const express = require('express');
const Router = express.Router();
const csurf = require('csurf');
//Controller
const UserController = require('../controllers/userController');
const AccountController = require('../controllers/accountController');
const TradeController = require('../controllers/tradeController');
const CryptoController = require('../controllers/cryptoController');
const buyController = require('../controllers/trade/buyController');
const sellController = require('../controllers/trade/sellController');

//middleware
const { userAuthentication, userAuthCookie } = require('../middlewares/auth');
const { captchaVerify } = require('../middlewares/captchaChecking');
const csurfProtection = csurf({ cookie: true, ignoreMethods: ['POST'] });
const { cryptoCache } = require('../middlewares/redis')


//-------------------- X -------------------------- ROUTER ---------------------------- X --------------------------//
//User
Router.get('/users', UserController.readAll);
Router.get('/users/myauth',userAuthentication,UserController.readMe);
Router.post('/users', captchaVerify,UserController.create);
Router.post('/users/login',UserController.login);
Router.get('/users/logout', userAuthentication,UserController.logout);
Router.get('/users/checkauth',userAuthentication,UserController.checkAuth);

//Account
Router.get('/accounts',AccountController.readAll);
Router.get('/myAccount', userAuthentication, AccountController.readMyAccount);
Router.get('/account',userAuthentication, AccountController.createAccount);

//LimitTrade
Router.get('/trade/limit',TradeController.readAllLimit);
Router.post('/trade/limit/buy', userAuthentication, buyController.createBuyLimit, buyController.checkBuyLimit)
Router.post('/trade/limit/sell', userAuthentication, sellController.createSellLimit, sellController.checkSellLimit)
Router.get('/trade/limit/myLimitTrade', userAuthentication, TradeController.readMyLimit);
Router.delete('/trade/limit/:limitId', userAuthentication, TradeController.deleteLimit)


//MarketTrade
Router.get('/trade/market', TradeController.readAllMarket);
Router.post('/trade/market/buy', userAuthentication, TradeController.createBuyMarket);
Router.post('/trade/limit/sell', userAuthentication, TradeController.createSellMarket);

//Crypto
Router.get('/cryptoprice', userAuthentication,CryptoController.getCryptoData);
// //Demo
// Router.get('/cryptoData', cryptoCache,CryptoController.getCryptoData);







//--------------------------------------------- SANDBOX ----------------------------------------------------->
const Account = require('../models/account');
const User = require('../models/user');
const LimitTrade = require('../models/limitTrade');
const History = require('../models/history');

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