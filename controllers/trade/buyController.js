const LimitTrade = require('../../models/limitTrade');
const History = require('../../models/history');
const Account = require('../../models/account');
const { generateText } = require('../../helpers/utilities');
const UserController = require('../userController');

const ALL_HISTORY = 'market';
const ALL_LIMIT = 'limit'

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
                let myAccount = await Account.findOneAndUpdate({user}, {
                    $inc: {[objectText]: -total}
                }, {omitUndefined:true, new:true})
                Io.emit(`${user}-trade-data`, {newAccount: myAccount});
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
        let { pair, order_type, first_currency, second_currency } = req.body;
        let objectText = generateText(first_currency);
        let objectText2 = generateText(second_currency);  

        let filterTrade = await LimitTrade.find({user: {$ne: user}, pair, price: {$lte: price}, order_type: 'sell'}).sort({price: 'desc'});

        if (filterTrade.length > 0) {
            let amountStart = 0;
            let amountLimit = amount;
            let allUpdateSocket = [];
            for (let i = 0; i < filterTrade.length; i++) {
                let item = filterTrade[i];
                if (amountStart < amountLimit) {
                    amountStart += item.amount;
                    allUpdateSocket.push((item.user));
                    if (amountStart < amountLimit) {

                        let addBalance = item.price * item.amount;
                        let surplus = myTrade.price * item.amount - (addBalance);

                        //Other --------
                        await LimitTrade.deleteOne({_id: item.id});
                        await Account.updateOne({user: item.user}, {
                            $inc: {[objectText2]: addBalance}
                        }, {omitUndefined: true})
                        await History.create({
                            user: item.user,
                            pair: item.pair,
                            order_type: item.order_type,
                            amount: item.amount,
                            price: item.price,
                        })
                        //My ----------
                        let newFilled = item.amount / myTrade.amount_limit;
                        await LimitTrade.updateOne({_id: myTrade.id}, {
                            $inc: {filled: newFilled, amount: -item.amount, total: (item.amount * myTrade.price)}
                        }, {omitUndefined: true})
                        await Account.updateOne({user}, {
                            $inc: {[objectText]: item.amount, [objectText2]: surplus}
                        }, {omitUndefined: true})
                        await History.create({
                            user,
                            pair,
                            order_type: myTrade.order_type,
                            amount: item.amount,
                            price: item.price
                        });

                    }else if (amountStart === amountLimit) {

                        let addBalance = item.amount * item.price;
                        let surplus = myTrade.price * item.amount - (addBalance)
                        //Other -------
                        await LimitTrade.deleteOne({_id: item.id});
                        await Account.updateOne({user: item.user}, {
                            $inc: {[objectText2]: addBalance}
                        }, {omitUndefined: true})
                        await History.create({
                            user: item.user,
                            pair: item.pair,
                            order_type: item.order_type,
                            amount: item.amount,
                            price: item.price,
                        })
                        //My ---------
                        await LimitTrade.deleteOne({_id: myTrade.id});
                        await Account.updateOne({user}, {
                            $inc: {[objectText]: item.amount, [objectText2]: surplus}
                        }, {omitUndefined: true})
                        await History.create({
                            user,
                            pair,
                            order_type: myTrade.order_type,
                            amount: item.amount,
                            price: item.price
                        });

                    }else {
                        let plusBalance = item.amount - (amountStart - amountLimit);
                        let currentBalance = plusBalance * item.price;
                        let newFilled = plusBalance / item.amount;
                        let surplus = (plusBalance * myTrade.price) - currentBalance;
                        
                        //Other
                        await LimitTrade.updateOne({_id: item.id}, {
                            $inc: {amount: -plusBalance, filled: newFilled, total: -currentBalance},
                        }, {omitUndefined: true});
                        await Account.updateOne({user: item.user}, {
                            $inc: {[objectText2]: currentBalance}
                        });
                        await History.create({
                            user: item.user,
                            pair: item.pair,
                            order_type: item.order_type,
                            amount: plusBalance,
                            price: item.price,
                        })

                        //My
                        await LimitTrade.deleteOne({_id: myTrade.id});
                        await Account.updateOne({user}, {
                            $inc: {[objectText2]: surplus, [objectText]: plusBalance}
                        }, {omitUndefined: true})
                        await History.create({
                            user,
                            pair,
                            order_type: myTrade.order_type,
                            amount: plusBalance,
                            price: item.price
                        });
                    }

                }else {
                    break;
                }

            };

            let allHistory = await History.find({pair});
            let allLimitTrades = await LimitTrade.find({pair});
            Io.emit(`${pair}-${ALL_HISTORY}`, allHistory);
            Io.emit(`${pair}-${ALL_LIMIT}`, allLimitTrades);

            let newId = [];
            for (let i = 0; i < allUpdateSocket.length; i++) {
                let find = false;

                for (let j = 0; j < newId.length; j++) {
                    if (String(allUpdateSocket[i]) == newId[j]) {
                        find = true;
                    }
                }
                if (!find) {
                    newId.push(String(allUpdateSocket[i]));
                }
            }
            for (let i = 0; i < newId.length; i++) {
                let id = newId[i];
                let myAccount = await Account.findOne({user: id});
                let myLimitTrades = await LimitTrade.find({user: id, pair});
                Io.emit(`${id}-trade-data`, {newAccount: myAccount, newLimitTrades: myLimitTrades});
            };

            let myNewAccount = await Account.findOne({user});
            let myNewLimitTrades = await LimitTrade.find({user, pair,});
            Io.emit(`${user}-trade-data`, {newAccount: myNewAccount, newLimitTrades: myNewLimitTrades});

        }else {
            let myNewAccount = await Account.findOne({user});
            let myNewLimitTrades = await LimitTrade.find({user, pair,});
            Io.emit(`${user}-trade-data`, {newAccount: myNewAccount, newLimitTrades: myNewLimitTrades});
        }

    };

    // static async checkBuyLimit(req,res,next) {
    //     let Io = req.Io;
    //     let user = req.decoded.id;
    //     let myTrade = req.myTrade;
    //     let amount = Number(req.body.amount);
    //     let price = Number(req.body.price);
    //     let { pair, first_currency, second_currency } = req.body;
    //     let objectText = generateText(first_currency);
    //     let objectText2 = generateText(second_currency);

    //     let filterTrade = await LimitTrade.find({user: {$ne: user}, pair, order_type: 'sell', price: {$lte: price}}).sort({price: 'desc'});
    //     if (filterTrade.length > 0) {
    //         let amountStart = 0;
    //         let amountLimit = amount;
    //         for (let i = 0; i < filterTrade.length; i++) {
    //             let item = filterTrade[i];
    //             if (amountStart < amountLimit) {
    //                 amountStart += item.amount;
    //                 if (amountStart < amountLimit) {
    //                     let totalBalance = item.amount * item.price;
    //                     let surplus = (myTrade.price * item.price) - totalBalance
    //                     //other
    //                     let { _id } = await LimitTrade.findOneAndDelete({_id: item.id});
    //                     let otherAccount = await Account.findOneAndUpdate({user: item.user}, {
    //                         $inc:{[objectText2]: totalBalance}
    //                     }, {omitUndefined: true, new: true});
    //                     //my
    //                     let newFilled = item.amount / myTrade.amount_limit;
    //                     let myUpdateLimit = await LimitTrade.findOneAndUpdate({_id: myTrade.id}, {
    //                         $inc:{amount: -item.amount, filled: newFilled}
    //                     }, {omitUndefined: true, new: true});
    //                     let myAccount = await Account.findOneAndUpdate({user}, {
    //                         $inc:{[objectText]: item.amount, [objectText2]: surplus}
    //                     })
    
    //                     //Account
    //                     Io.emit(`${item.user}-${UPDATE_ACCOUNT}`, otherAccount);
    //                     //limit
    //                     let otherLimits = await LimitTrade.find({user: item.user, pair})
    //                     Io.emit(`${item.user}-${pair}-${UPDATE_LIMIT}`, otherLimits);
    
    //                 }else if (amountStart === amountLimit) {
    //                     let totalBalance = item.amount * item.price;
    //                     let surplus = (myTrade.price * item.price) - totalBalance
    //                     //other
    //                     let { _id } = await LimitTrade.findOneAndDelete({_id: item.id});
    //                     let otherAccount = await Account.findOneAndUpdate({user: item.user},{
    //                         $inc: {[objectText2]: totalBalance}
    //                     }, {omitUndefined:true, new:true})
    
    //                     //My
    //                     let deleteLimit = await LimitTrade.findOneAndDelete({_id: myTrade.id});
    //                     let myAccount = await Account.findOneAndUpdate({user: myTrade.user}, {
    //                         $inc:{[objectText]: item.amount, [objectText2]: surplus}    
    //                     }, {omitUndefined: true, new: true})
                        
    //                     //Account
    //                     Io.emit(`${item.user}-${UPDATE_ACCOUNT}`, otherAccount);
    //                     let otherLimits = await LimitTrade.find({user: item.user, pair})
    //                     Io.emit(`${item.user}-${pair}-${UPDATE_LIMIT}`, otherLimits);
    
    //                 }else { //amountStart > amountLimit
                        
    //                     let plusAmount = amountStart - amountLimit;
    //                     let currentAmount = item.amount - plusAmount;
    //                     let addBalance = currentAmount * item.price;
    //                     let surplus = (currentAmount * myTrade.price) - addBalance;
    //                     //Other
    //                     let newFilled = currentAmount / item.amount_limit;
    //                     let otherAccount = await Account.findOneAndUpdate({user: item.user}, {
    //                         $inc: {[objectText2]: addBalance}
    //                     }, {omitUndefined: true, new: true})
    //                     await LimitTrade.findOneAndUpdate({_id: item.id}, {
    //                         $inc: {amount: -currentAmount, filled: newFilled}
    //                     }, {omitUndefined: true, new: true});
                        
    //                     //My
    //                     let { _id } = await LimitTrade.findOneAndDelete({_id: myTrade.id});
    //                     let myAccount = await Account.findOneAndUpdate({user}, {
    //                         $inc:{[objectText]: currentAmount, [objectText2]: surplus}
    //                     },{omitUndefined: true, new: true});

    //                     //other Socket
                        
    //                     Io.emit(`${item.user}-${UPDATE_ACCOUNT}`, otherAccount);
    //                     let otherUpdateLimit = await LimitTrade.find({user: item.user, pair: item.pair})
    //                     Io.emit(`${item.user}-${pair}-${UPDATE_LIMIT}`, otherUpdateLimit);
    //                 }
    //             }
    //         };

    //         let allTrade = await LimitTrade.find({pair});
    //         Io.emit(`${pair}-${ALL_LIMIT}`, allTrade);
    //         let myLimit = await LimitTrade.find({pair, user});
    //         Io.emit(`${user}-${pair}-${UPDATE_LIMIT}`, myLimit);
    //         let myAccount = await Account.findOne({user});
    //         Io.emit(`${user}-${UPDATE_ACCOUNT}`, myAccount)

    //     };//-----------------

    // };

};

module.exports = TradeController;