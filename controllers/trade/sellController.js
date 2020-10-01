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
                let myAccount = await Account.findOneAndUpdate({user}, { $inc: {[objectText]: -amount} }, {omitUndefined: true, new: true})
                let allTrades = await LimitTrade.find({pair})
                Io.emit(`${pair}-${ALL_LIMIT}`, allTrades);
                Io.emit(`${user}-trade-data`, {myAccount})
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

        let filterTrades = await LimitTrade.find({user: {$ne: user},pair, order_type: 'buy', price: {$gte: price}}).sort({price: 'desc'});
        if (filterTrades.length > 0) {
            let amountStart = 0;
            let amountLimit = amount;
            let allUpdateSocket = [];
            for (let i = 0; i < filterTrades.length; i++) {

                let item = filterTrades[i];

                if (amountStart < amountLimit) {
                    allUpdateSocket.push(item.user);
                    amountStart += item.amount;
                    if (amountStart < amountLimit) {

                        let addBalance = item.amount * myTrade.price;
                        let surplus = (item.price * item.amount) - addBalance;

                        //Other
                        await LimitTrade.deleteOne({_id: item.id});
                        await Account.updateOne({user: item.user}, {
                            $inc: {[objectText]: item.amount, [objectText2]: surplus}
                        }, {omitUndefined: true})
                        await History.create({
                            user: item.user,
                            pair: item.pair,
                            order_type: item.order_type,
                            amount: item.amount,
                            price: myTrade.price,
                        })
                        //My
                        let newFilled = item.amount / myTrade.amount_limit;
                        await LimitTrade.updateOne({_id: myTrade.id}, {
                            $inc: {amount: -item.amount, total: -addBalance, filled: newFilled}
                        }, {omitUndefined:true});
                        await Account.updateOne({user}, {
                            $inc:{[objectText2]: addBalance}
                        }, {omitUndefined: true})
                        await History.create({
                            user: item.user,
                            pair: item.pair,
                            order_type: item.order_type,
                            amount: item.amount,
                            price: myTrade.price,
                        })

                    }else if (amountStart === amountLimit) {

                        let addBalance = item.amount * myTrade.price;
                        let surplus = (item.amount * item.price) - addBalance;
                        //Other
                        await LimitTrade.deleteOne({_id: item.id});
                        await Account.updateOne({user: item.user}, {
                            $inc:{[objectText]: item.amount, [objectText2]: surplus}
                        }, {omitUndefined: true});
                        await History.create({
                            user: item.user,
                            pair: item.pair,
                            order_type: item.order_type,
                            amount: item.amount,
                            price: myTrade.price,
                        });
                        //MY
                        await LimitTrade.deleteOne({_id: myTrade.id});
                        await Account.updateOne({user}, {
                            $inc: {[objectText2]: addBalance}
                        }, {omitUndefined: true})
                        await History.create({
                            user: myTrade.user,
                            pair: myTrade.pair,
                            order_type: myTrade.order_type,
                            amount: item.amount,
                            price: myTrade.price,
                        })
                    }else { 
                        let addBalance = myTrade.amount * myTrade.price;
                        let surplus = (myTrade.amount * item.price) - addBalance;
                        let newFiled = myTrade.amount / item.amount_limit;
                        //Other
                        await LimitTrade.updateOne({_id: item.id}, {
                            $inc: {amount: myTrade.amount, total: (myTrade.amount * item.price), filled: newFiled}
                        }, {omitUndefined: true});
                        await Account.updateOne({user: item.user}, {
                            $inc: {[objectText]: myTrade.amount, [objectText2]: surplus}
                        }, {omitUndefined: true})
                        await History.create({
                            user: item.user,
                            pair: item.pair,
                            order_type: item.order_type,
                            amount: myTrade.amount,
                            price: myTrade.price,
                        });
                        
                        //My
                        await LimitTrade.deleteOne({_id: myTrade.id});
                        await Account.updateOne({user}, {[objectText2]: addBalance}, {omitUndefined: true})
                        await History.create({
                            user: myTrade.user,
                            pair: myTrade.pair,
                            order_type: mytrade.order_type,
                            amount: myTrade.amount,
                            price: myTrade.price,
                        })
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
            let allHistory = await History.find({pair});
            Io.emit(`${pair}-${ALL_HISTORY}`, allHistory);
            let myNewAccount = await Account.findOne({user});
            let myNewLimitTrades = await LimitTrade.find({user, pair,});
            Io.emit(`${user}-trade-data`, {newAccount: myNewAccount, newLimitTrades: myNewLimitTrades});
        }


     
    }

    // static async checkSellLimit(req,res,next) {
    //     let Io = req.Io;
    //     let user = req.decoded.id;
    //     let myTrade = req.myTrade;
    //     let { order_type, first_currency, second_currency, pair } = req.body;
    //     let amount = Number(req.body.amount);
    //     let price = Number(req.body.price);
    //     let objectText = generateText(first_currency);
    //     let objectText2 = generateText(second_currency);

    //     let filterTrades = await LimitTrade.find({user: {$ne: user},pair, order_type: 'buy', price: {$gte: price}}).sort({price: 'desc'})
    //     if (filterTrades.length > 0) {
    //         let amountStart = 0;
    //         let amountLimit = amount;

    //         for (let i = 0; i < filterTrades.length; i++) {
    //             let item = filterTrades[i];
    //             if (amountStart < amountLimit) {
    //                 amountStart += item.amount;
    //                 if (amountStart < amountLimit) {
    //                     let totalBalance = item.amount * item.price;
    //                     let surplus = (myTrade.price * item.amount) - totalBalance
    //                     //Other
    //                     let otherUpdateAccount = await Account.findOneAndUpdate({user: item.user}, {
    //                         $inc:{[objectText2]: surplus, [objectText2]: item.amount}
    //                     }, {omitUndefined: true, new: true})
    //                     let { _id } = await LimitTrade.findOneAndDelete({_id: item.id});

    //                     //My
    //                     let newFilled = item.amount / myTrade.amount_limit;
    //                     await Account.updateOne({user}, {
    //                         $inc: {[objectText2]: totalBalance}
    //                     }, {omitUndefined: true, new: true});
    //                     await LimitTrade.findOneAndUpdate({_id: myTrade.id}, {
    //                         $inc: {amount: -item.amount, filled: newFilled}
    //                     }, {omitUndefined: true, new: true})

    //                     let otherLimits = await LimitTrade.find({user: item.user, pair})

    //                     Io.emit(`${item.user}-${pair}-${UPDATE_LIMIT}`, otherLimits);
    //                     Io.emit(`${item.user}-${UPDATE_ACCOUNT}`, otherUpdateAccount);

    //                 }else if (amountStart === amountLimit) {
    //                     let totalBalance = item.amount * item.price;
    //                     let surplus = (item.amount * myTrade.price) - totalBalance;

    //                     //Other
    //                     let otherUpdateAccount = await Account.findOneAndUpdate({user: item.user}, {
    //                         $inc:{[objectText2]: surplus, [objectText2]: item.amount}
    //                     }, {omitUndefined:true, new: true})
    //                     let { _id } = await LimitTrade.findOneAndDelete({_id: item.id});

    //                     //My
    //                     await Account.updateOne({user}, {
    //                         $inc:{[objectText2]: totalBalance}
    //                     }, {omitUndefined: true, new: true});
    //                     await LimitTrade.deleteOne({_id: myTrade.id});

    //                     Io.emit(`${item.user}-${UPDATE_ACCOUNT}`, otherUpdateAccount);
    //                     let otherLimits = await LimitTrade.find({user: item.user, pair})
    //                     Io.emit(`${item.user}-${pair}-${UPDATE_LIMIT}`, otherLimits);

    //                 }else { //amountStart > amountLimit

    //                     let currentBalance = item.amount - (amountStart - amountLimit);

    //                     let addBalance = currentBalance * myTrade.price;
    //                     let surplus = (currentBalance * item.price) - addBalance;
    //                     let newFilled = currentBalance / item.amount_limit;
    //                     //other
    //                     await LimitTrade.updateOne({_id: item.id}, {
    //                         $inc:{amount: -currentBalance, filled: newFilled}
    //                     }, {omitUndefined: true, new:true})

    //                     await Account.updateOne({user: item.user}, {
    //                         $inc: {[objectText2]: surplus, [objectText]: currentBalance}
    //                     }, {omitUndefined: true, new: true});

    //                     //My
    //                     await LimitTrade.deleteOne({_id: myTrade.id});
    //                     await Account.updateOne({user}, {
    //                         $inc:{[objectText2]: addBalance}
    //                     }, {omitUndefined: true, new:true})

    //                     let others = await Account.findOne({user: item.user})
    //                     Io.emit(`${item.user}-${UPDATE_ACCOUNT}`, others);
    //                     let updateLimit = await LimitTrade.find({pair, user: item.user});
    //                     Io.emit(`${item.user}-${pair}-${UPDATE_LIMIT}`, updateLimit);
    //                 }
    //             }
    //         }//end loop
    //         let myAccount = await Account.findOne({user});
    //         let myLimits = await LimitTrade.find({user, pair});
    //         let allTrades = await LimitTrade.find({});
    //         Io.emit(`${pair}-${ALL_LIMIT}`, allTrades)
    //         Io.emit(`${user}-${UPDATE_ACCOUNT}`, myAccount);
    //         Io.emit(`${user}-${pair}-${UPDATE_LIMIT}`, myLimits);
    //     }
        
    // }

};


module.exports = SellController;