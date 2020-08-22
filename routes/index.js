const express = require('express');
const Router = express.Router();
//Controller
const UserController = require('../controllers/userController');
const AccountController = require('../controllers/accountController');
const TradeController = require('../controllers/tradeController');
//middleware
const { userAuthentication, userAuthCookie } = require('../middlewares/auth');
const { captchaVerify } = require('../middlewares/captchaChecking')

//User
Router.get('/users', UserController.readAll);
Router.get('/users/myauth', userAuthCookie, UserController.readMe);
Router.post('/users', captchaVerify,UserController.create);
Router.post('/users/login', UserController.login);
Router.get('/users/logout', UserController.logout);
Router.get('/users/checkauth', UserController.checkAuth);

//Account
Router.get('/accounts', AccountController.readAll);
Router.get('/myAccount', userAuthCookie, AccountController.readMyAccount);
Router.get('/account',userAuthCookie, AccountController.createAccount);

//LimitTrade
Router.get('/trade/limit', TradeController.readAllLimit)
Router.post('/trade/limit/buy', userAuthCookie, TradeController.createBuyLimit, TradeController.checkBuyLimit)
Router.post('/trade/limit/sell', userAuthCookie, TradeController.createSellLimit, TradeController.checkSellLimit)
Router.get('/trade/limit/myLimitTrade', userAuthCookie, TradeController.readMyLimit);

//MarketTrade


//-------------------------------------------------------->
const Account = require('../models/account');
const User = require('../models/user');
const LimitTrade = require('../models/limitTrade');


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