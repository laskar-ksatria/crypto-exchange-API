const LimitTrade = require('../../models/limitTrade');
const History = require('../../models/history');
const Account = require('../../models/account');
const { generateText } = require('../../helpers/utilities');

const DELETE_LIMIT = `deletemylimit`;
const ADD_HISTORY = 'addmyhistory';
const ADD_LIMIT = `addmylimit`;
const UPDATE_LIMIT = 'updatemylimit';
const UPDATE_ACCOUNT = 'updatemyaccount';
const ALL_HISTORY = 'market';
const ALL_LIMIT = 'limit'
const ADD_MARKETHISTORY = 'addmymarkethistory';


class SellController {

    static async createSellLimit(req,res,next) {
        let Io = req.Io
        let user = req.decoded.id;
        let { order_type, first_currency, second_currency, pair } = req.body;
        let price = Number(req.body.price);
        let amount = Number(req.body.amount);
        let objectText = generateText(first_currency);

        let myAccount = await Account.findOne({user})
        if (myAccount) {
            let myBalance = myAccount[objectText];
            if (myBalance < amount) {
                    next({message: "You dont have enough balance"});
            }else {
                let myTrade = await LimitTrade.create({pair,user, amount, price, first_currency, second_currency, amount_limit: amount, total: amount * price, order_type})
                req.myTrade = myTrade;
                const updateMyAccount = await Account.findOneAndUpdate({user}, { $inc: {[objectText]: -amount} }, {omitUndefined: true, new: true})
                let allTrades = await LimitTrade.find({pair})
                Io.emit(`${pair}-${ALL_LIMIT}`, allTrades);
                Io.emit(`${user}-${UPDATE_ACCOUNT}`, updateMyAccount);
                let mytrades = await LimitTrade.find({user, pair})
                Io.emit(`${user}-${pair}-${UPDATE_LIMIT}`, mytrades);
                res.status(200).json({message: 'Your order has been created'})
                next();
            }
        }else {
            next({message: `You dont have account`})
        }
    };


    static async checkSellLimit(req,res,next) {
        let Io = req.Io;
        let user = req.decoded.id;
        let myTrade = req.myTrade;
        let { order_type, first_currency, second_currency, pair } = req.body;
        let amount = Number(req.body.amount);
        let price = Number(req.body.price);
        let objectText = generateText(first_currency);
        let objectText2 = generateText(second_currency);

        let filterTrades = await LimitTrade.find({user: {$ne: user},pair, order_type: 'buy', price: {$gte: price}}).sort({price: 'desc'})
        if (filterTrades.length > 0) {
            let amountStart = 0;
            let amountLimit = amount;

            for (let i = 0; i < filterTrades.length; i++) {
                let item = filterTrades[i];
                if (amountStart < amountLimit) {
                    amountStart += item.amount;
                    if (amountStart < amountLimit) {
                        let totalBalance = item.amount * item.price;
                        let surplus = (myTrade.price * item.amount) - totalBalance
                        //Other
                        let otherUpdateAccount = await Account.findOneAndUpdate({user: item.user}, {
                            $inc:{[objectText2]: surplus, [objectText2]: item.amount}
                        }, {omitUndefined: true, new: true})
                        let { _id } = await LimitTrade.findOneAndDelete({_id: item.id});

                        //My
                        let newFilled = item.amount / myTrade.amount_limit;
                        await Account.updateOne({user}, {
                            $inc: {[objectText2]: totalBalance}
                        }, {omitUndefined: true, new: true});
                        await LimitTrade.findOneAndUpdate({_id: myTrade.id}, {
                            $inc: {amount: -item.amount, filled: newFilled}
                        }, {omitUndefined: true, new: true})

                        let otherLimits = await LimitTrade.find({user: item.user, pair})

                        Io.emit(`${item.user}-${pair}-${UPDATE_LIMIT}`, otherLimits);
                        Io.emit(`${item.user}-${UPDATE_ACCOUNT}`, otherUpdateAccount);

                    }else if (amountStart === amountLimit) {
                        let totalBalance = item.amount * item.price;
                        let surplus = (item.amount * myTrade.price) - totalBalance;

                        //Other
                        let otherUpdateAccount = await Account.findOneAndUpdate({user: item.user}, {
                            $inc:{[objectText2]: surplus, [objectText2]: item.amount}
                        }, {omitUndefined:true, new: true})
                        let { _id } = await LimitTrade.findOneAndDelete({_id: item.id});

                        //My
                        await Account.updateOne({user}, {
                            $inc:{[objectText2]: totalBalance}
                        }, {omitUndefined: true, new: true});
                        await LimitTrade.deleteOne({_id: myTrade.id});

                        Io.emit(`${item.user}-${UPDATE_ACCOUNT}`, otherUpdateAccount);
                        let otherLimits = await LimitTrade.find({user: item.user, pair})
                        Io.emit(`${item.user}-${pair}-${UPDATE_LIMIT}`, otherLimits);

                    }else { //amountStart > amountLimit

                        let currentBalance = item.amount - (amountStart - amountLimit);

                        let addBalance = currentBalance * myTrade.price;
                        let surplus = (currentBalance * item.price) - addBalance;
                        let newFilled = currentBalance / item.amount_limit;
                        //other
                        await LimitTrade.updateOne({_id: item.id}, {
                            $inc:{amount: -currentBalance, filled: newFilled}
                        }, {omitUndefined: true, new:true})

                        await Account.updateOne({user: item.user}, {
                            $inc: {[objectText2]: surplus, [objectText]: currentBalance}
                        }, {omitUndefined: true, new: true});

                        //My
                        await LimitTrade.deleteOne({_id: myTrade.id});
                        await Account.updateOne({user}, {
                            $inc:{[objectText2]: addBalance}
                        }, {omitUndefined: true, new:true})

                        let others = await Account.findOne({user: item.user})
                        Io.emit(`${item.user}-${UPDATE_ACCOUNT}`, others);
                        let updateLimit = await LimitTrade.find({pair, user: item.user});
                        Io.emit(`${item.user}-${pair}-${UPDATE_LIMIT}`, updateLimit);
                    }
                }
            }//end loop
            let myAccount = await Account.findOne({user});
            let myLimits = await LimitTrade.find({user, pair});
            let allTrades = await LimitTrade.find({});
            Io.emit(`${pair}-${ALL_LIMIT}`, allTrades)
            Io.emit(`${user}-${UPDATE_ACCOUNT}`, myAccount);
            Io.emit(`${user}-${pair}-${UPDATE_LIMIT}`, myLimits);
        }
        
    }

};


module.exports = SellController;