const LimitTrade = require('../../models/limitTrade');
const History = require('../../models/history');
const Account = require('../../models/account');
const { generateText } = require('../../helpers/utilities');
const UserController = require('../userController');

const DELETE_LIMIT = `deletemylimit`;
const ADD_HISTORY = 'addmyhistory';
const ADD_LIMIT = `addmylimit`;
const UPDATE_LIMIT = 'updatemylimit';
const UPDATE_ACCOUNT = 'updatemyaccount';
const ALL_HISTORY = 'market';
const ALL_LIMIT = 'limit'
const ADD_MARKETHISTORY = 'addmymarkethistory';

class TradeController {

    static async createBuyLimit(req,res,next) {
        let Io = req.Io;
        let user = req.decoded.id;
        let { order_type,second_currency, first_currency, pair } = req.body;
        let price = Number(req.body.price);
        let amount = Number(req.body.amount);
        let total = price * amount;
        let objectText = generateText(second_currency)
        let myAccount = await Account.findOne({user})
        if (myAccount) {
            let myBalance = myAccount[objectText];
            if (total <= myBalance) {
                let myTrade = await LimitTrade.create({
                    user, pair,
                    price, amount, total, amount_limit: amount,
                    first_currency, second_currency,
                    order_type
                })
                let updateMyaccount = await Account.findOneAndUpdate({user}, {
                    $inc: {[objectText]: -total}
                }, {omitUndefined:true, new:true})
                Io.emit(`${user}-${UPDATE_ACCOUNT}`, updateMyaccount);
                let mytrades = await LimitTrade.find({user, pair})
                Io.emit(`${user}-${pair}-${UPDATE_LIMIT}`, mytrades);
                res.status(202).json({message: "Your order has been created"});
                let trades = await LimitTrade.find({pair})
                req.myTrade = myTrade;
                Io.emit(`${pair}-${ALL_LIMIT}`, trades);
                next();
            }else {
                next({message: "You dont have enough balance"})
            }
        }else {
            next({message: "You dont have account"})
        }
    };

    static async checkBuyLimit(req,res,next) {
        let Io = req.Io;
        let user = req.decoded.id;
        let myTrade = req.myTrade;
        let amount = Number(req.body.amount);
        let price = Number(req.body.price);
        let { pair, first_currency, second_currency } = req.body;
        let objectText = generateText(first_currency);
        let objectText2 = generateText(second_currency);

        let filterTrade = await LimitTrade.find({user: {$ne: user}, pair, order_type: 'sell', price: {$lte: price}}).sort({price: 'desc'});
        if (filterTrade.length > 0) {
            let amountStart = 0;
            let amountLimit = amount;
            for (let i = 0; i < filterTrade.length; i++) {
                let item = filterTrade[i];
                if (amountStart < amountLimit) {
                    amountStart += item.amount;
                    if (amountStart < amountLimit) {
                        let totalBalance = item.amount * item.price;
                        let surplus = (myTrade.price * item.price) - totalBalance
                        //other
                        let { _id } = await LimitTrade.findOneAndDelete({_id: item.id});
                        let otherAccount = await Account.findOneAndUpdate({user: item.user}, {
                            $inc:{[objectText2]: totalBalance}
                        }, {omitUndefined: true, new: true});
                        //my
                        let newFilled = item.amount / myTrade.amount_limit;
                        let myUpdateLimit = await LimitTrade.findOneAndUpdate({_id: myTrade.id}, {
                            $inc:{amount: -item.amount, filled: newFilled}
                        }, {omitUndefined: true, new: true});
                        let myAccount = await Account.findOneAndUpdate({user}, {
                            $inc:{[objectText]: item.amount, [objectText2]: surplus}
                        })
    
                        //Account
                        Io.emit(`${item.user}-${UPDATE_ACCOUNT}`, otherAccount);
                        //limit
                        let otherLimits = await LimitTrade.find({user: item.user, pair})
                        Io.emit(`${item.user}-${pair}-${UPDATE_LIMIT}`, otherLimits);
    
                    }else if (amountStart === amountLimit) {
                        let totalBalance = item.amount * item.price;
                        let surplus = (myTrade.price * item.price) - totalBalance
                        //other
                        let { _id } = await LimitTrade.findOneAndDelete({_id: item.id});
                        let otherAccount = await Account.findOneAndUpdate({user: item.user},{
                            $inc: {[objectText2]: totalBalance}
                        }, {omitUndefined:true, new:true})
    
                        //My
                        let deleteLimit = await LimitTrade.findOneAndDelete({_id: myTrade.id});
                        let myAccount = await Account.findOneAndUpdate({user: myTrade.user}, {
                            $inc:{[objectText]: item.amount, [objectText2]: surplus}    
                        }, {omitUndefined: true, new: true})
                        
                        //Account
                        Io.emit(`${item.user}-${UPDATE_ACCOUNT}`, otherAccount);
                        let otherLimits = await LimitTrade.find({user: item.user, pair})
                        Io.emit(`${item.user}-${pair}-${UPDATE_LIMIT}`, otherLimits);
    
                    }else { //amountStart > amountLimit
                        
                        let plusAmount = amountStart - amountLimit;
                        let currentAmount = item.amount - plusAmount;
                        let addBalance = currentAmount * item.price;
                        let surplus = (currentAmount * myTrade.price) - addBalance;
                        //Other
                        let newFilled = currentAmount / item.amount_limit;
                        let otherAccount = await Account.findOneAndUpdate({user: item.user}, {
                            $inc: {[objectText2]: addBalance}
                        }, {omitUndefined: true, new: true})
                        await LimitTrade.findOneAndUpdate({_id: item.id}, {
                            $inc: {amount: -currentAmount, filled: newFilled}
                        }, {omitUndefined: true, new: true});
                        
                        //My
                        let { _id } = await LimitTrade.findOneAndDelete({_id: myTrade.id});
                        let myAccount = await Account.findOneAndUpdate({user}, {
                            $inc:{[objectText]: currentAmount, [objectText2]: surplus}
                        },{omitUndefined: true, new: true});

                        //other Socket
                        
                        Io.emit(`${item.user}-${UPDATE_ACCOUNT}`, otherAccount);
                        let otherUpdateLimit = await LimitTrade.find({user: item.user, pair: item.pair})
                        Io.emit(`${item.user}-${pair}-${UPDATE_LIMIT}`, otherUpdateLimit);
                    }
                }
            };

            let allTrade = await LimitTrade.find({pair});
            Io.emit(`${pair}-${ALL_LIMIT}`, allTrade);
            let myLimit = await LimitTrade.find({pair, user});
            Io.emit(`${user}-${pair}-${UPDATE_LIMIT}`, myLimit);
            let myAccount = await Account.findOne({user});
            Io.emit(`${user}-${UPDATE_ACCOUNT}`, myAccount)

        };//-----------------

    };

};

module.exports = TradeController;