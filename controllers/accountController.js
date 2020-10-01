const Account = require('../models/account');
const User = require('../models/user');

class AccountController {

    static readAll(req,res,next) {
        Account.find({}).then(accounts => res.status(200).json(accounts))
    };

    static readMyAccount(req,res,next) {
        let user = req.decoded.id;
        Account.findOne({user}).then(account => res.status(200).json(account)).catch(next)
    };

    static createAccount(req,res,next) {
        let user = req.decoded.id;
        let newAccount;
        Account.create({user, BTC_coin: 70, balance: 50, ETH_coin: 70, LTC_coin: 70})
            .then(account => {
                newAccount = account
                User.updateOne({_id: user}, {account: account.id}, {omitUndefined: true})
                    .then(() => res.status(200).json(newAccount));
            })
    };

};

module.exports = AccountController