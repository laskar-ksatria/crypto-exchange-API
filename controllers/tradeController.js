const LimitTrade = require('../models/limitTrade');
const History = require('../models/history');
const Account = require('../models/account');
const { generateText } = require('../helpers/utilities')

const DELETE_LIMIT = `deletemylimit`;
const ADD_HISTORY = 'addmyhistory';
const ADD_LIMIT = `addmylimit`;
const UPDATE_LIMIT = 'updatemylimit';
const UPDATE_ACCOUNT = 'updatemyaccount';
const ALL_HISTORY = 'market';
const ALL_LIMIT = 'limit'

class TradeController {

    static readAllLimit(req,res,next) {
        let { pair } = req.query;   
        if (pair) {
            LimitTrade.find({pair}).then(trades => res.status(200).json(trades)).catch(next)
        }else {
            LimitTrade.find({}).then(trades => res.status(200).json(trades)).catch(next)
        }
    };

    static readMyLimit(req,res,next) {
        let { pair } = req.query;
        let user = req.decoded.id;
        if (pair) {
            LimitTrade.find({pair, user})
                .then(limitTrades => {
                    res.status(200).json(limitTrades)
                })
        }else {
            LimitTrade.find({user})
                .then(limitTrades => {
                    res.status(200).json(limitTrades)
                })
        }
    }

    static readAllMarket(req,res,next) {
        let { pair } = req.query;
        History.find({pair})
            .then(trades => res.status(200).json(trades)).catch(next)
    };

    static async deleteLimitOrder(req,res,next) {
        let Io = req.Io;
        let tradeId = req.params.tradeId;
        let { first_currency, second_currency, order_type } = req.body;
        let { _id,amount, price, user, pair } = await LimitTrade.findOneAndDelete({_id: tradeId});
        let backBalance;
        let objectText;
        if (order_type === 'buy') {
            backBalance = price * amount
            objectText = second_currency
        }else if (order_type === 'sell') {
            backBalance = amount
            objectText = first_currency
        }
        let updateAccount = await Account.findOneAndUpdate({user: user}, {
            $inc: {[`${objectText}`]: backBalance}
        }, {omitUndefined: true, new: true})
        res.status(201).json({message: "Your order limit has been cancel"});
        Io.emit(`${user}-${pair}-${DELETE_LIMIT}`, _id);
        Io.emit(`${user}-${pair}-${UPDATE_ACCOUNT}`, updateAccount);
        let limitTrades = await LimitTrade.find({pair})
        Io.emit(`${pair}-${ALL_LIMIT}`, limitTrades);
    };

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
                Io.emit(`${user}-${pair}-${ADD_LIMIT}`, myTrade);
                res.status(202).json({message: "Your order has been created"});
                let trades = await LimitTrade.find({pair})
                req.myTrade = myTrade;
                Io.emit(`${pair}-${ALL_LIMIT}`, trades);
                next();
            }else {
                console.log("Masuk Trade")
            }
        }else {
            console.log('myAccount')
            next({message: "You dont have account"})
        }


    };

    static async checkBuyLimit(req,res,next) {
        console.log("masuk check buy")
        let Io = req.Io;
        let user = req.decoded.id;
        let myTrade = req.myTrade;
        let { order_type, first_currency, second_currency, pair } = req.body;
        let amount = Number(req.body.amount);
        let price = Number(req.body.price);
        let objectText = generateText(first_currency);
        let objectText2 = generateText(second_currency);

        let filterTrades = await LimitTrade.find({pair, order_type: 'sell', price: {$lte: price}}).sort({price: 'desc'})
        for (let i = 0; i < filterTrades.length; i++) {
            let item = filterTrades[i];
            let amountStart = 0;
            let amountLimit = amount;
            let otherHistory;
            let otherAccount;
            let otherUpdateLimit;
            let myHistory;
            let myAccount;
            let myUpdateLimit;
            let itemTotal = item.amount * item.price;
            amountStart += item.amount;

            if (amountStart < amountLimit) {

                //OTHER PROCESS
                let { _id } = await LimitTrade.findOneAndDelete({_id: item.id});
                otherAccount = await Account.findOneAndUpdate({user: item.user}, {
                    $inc: {[objectText2]: itemTotal}
                }, {omitUndefined: true, new: true}) 
                otherHistory = await History.create({user: item.user, order_type: item.order_type, price: item.price, amount: item.amount, pair: item.pair})

                //MY PROCESS
                let filledPlus = amountStart / amountLimit;
                let surplus = (item.amount * myTrade.price) - (item.amount * item.price)
                myUpdateLimit = await LimitTrade.findOneAndUpdate({_id: myTrade.id}, {
                    $inc: {amount: -item.amount, amount_start: item.amount},total: (amountLimit - amountStart) * myTrade.price, filled: filledPlus
                }, {omitUndefined: true, new: true})
                myAccount = await Account.findOneAndUpdate({user: myTrade.user}, {
                    $inc: {[objectText]: item.amount, [objectText2]: surplus},
                }, {omitUndefined: true, new: true})
                
                myHistory = await History.create({user: myTrade.user, amount: item.amount, price: item.price, order_type: myTrade.order_type, pair: myTrade.pair})

                //socket.Io
                Io.emit(`${item.user}-${pair}-${DELETE_LIMIT}`, _id);
                Io.emit(`${item.user}-${pair}-${ADD_HISTORY}`, otherHistory);
                Io.emit(`${item.user}-${pair}-${UPDATE_ACCOUNT}`, otherAccount);

                Io.emit(`${myTrade.user}-${pair}-${UPDATE_LIMIT}`, myUpdateLimit);
                Io.emit(`${myTrade.iser}-${pair}-${UPDATE_ACCOUNT}`, myAccount);
                Io.emit(`${myTrade.user}-${pair}-${ADD_HISTORY}`, myHistory);

            }else if (amountStart === amountLimit) {
                //OTHER PROCESS
                let { _id } = await LimitTrade.findOneAndDelete({_id: item.id});
                otherAccount = await Account.findOneAndUpdate({user: item.user}, {
                    $inc: {[objectText2]: itemTotal}
                }, {omitUndefined: true, new: true})
                otherHistory = await History.create({user: item.user, amount: item.amount, price: item.price, order_type: item.order_type, pair: item.pair})
                
                //MY PROCESS
                let deletedLimit  = await LimitTrade.findOneAndDelete({_id: myTrade.id})
                myAccount = await Account.findOneAndUpdate({user: myTrade.user}, {
                    $inc: {[objectText]: item.amount}
                }, {omitUndefined: true, new: true})
                myHistory = await History.create({user: myTrade.user, amount: item.amount, order_type: myTrade.order_type, pair: myTrade.pair, price: item.price})
                
                Io.emit(`${item.user}-${pair}-${DELETE_LIMIT}`, _id);
                Io.emit(`${myTrade.user}-${pair}-${DELETE_LIMIT}`, deletedLimit.id);

                Io.emit(`${item.user}-${pair}-${ADD_HISTORY}`)
                Io.emit(`${myTrade.user}-${pair}-${ADD_HISTORY}`, myHistory);

                Io.emit(`${item.user}-${UPDATE_ACCOUNT}`, otherAccount)
                Io.emit(`${myTrade.user}-${UPDATE_ACCOUNT}`, myAccount)
console.log(myAccount, "Myaccount")

            }else {
                
                let minusBalance = item.amount - (amountStart - amountLimit);
                let totalCreate = minusBalance * item.price;
                let surplusBalance = (minusBalance * myTrade.price) - totalCreate;
                let { amount_start, amount_limit } = item;
                let newFilled = (amount_start + minusBalance) / amount_limit;

                //Other Process
                otherUpdateLimit = await LimitTrade.findOneAndDelete({_id: item.id}, {
                    $inc: {amount: -minusBalance, amount_start: minusBalance}, filled: newFilled
                }, {omitUndefined: true, new:true})
                otherAccount = await Account.findOneAndDelete({user: item.user}, {}, {});
                otherHistory = await History.create({user: item.user, amount: item.amount, price: item.price, order_type: item.order_type, pair: item.pair})
                
                //My Process
                let { _id } = await LimitTrade.findOneAndDelete({_id: myTrade.id});
                myAccount = await Account.findOneAndUpdate({user: myTrade.user}, {
                    $inc: {[objectText]: minusBalance, [objectText2]: surplusBalance}
                }, {omitUndefined: true, new: true})
                myHistory = await History.create({user: myTrade.user, amount: minusBalance, price: item.price, order_type: myTrade.order_type, pair: myTrade.pair})

                //Socket
                Io.emit(`${item.user}-${pair}-${UPDATE_LIMIT}`, otherUpdateLimit);
                Io.emit(`${myTrade.user}-${pair}-${DELETE_LIMIT}`, _id);

                Io.emit(`${item.user}-${pair}-${ADD_HISTORY}`, otherHistory);
                Io.emit(`${myTrade.user}-${pair}-${ADD_HISTORY}`, myHistory);

                Io.emit(`${item.user}-${pair}-${UPDATE_ACCOUNT}`, otherAccount);
                Io.emit(`${myTrade.user}-${pair}-${UPDATE_ACCOUNT}`, myHistory);

            }
            
            let limitTrades = await LimitTrade.find({pair})
            let allHistory = await History.find({pair});

            Io.emit(`${pair}-limit`, limitTrades);
            Io.emit(`${pair}-market`, allHistory);

        };//END LOOPING
        
    };

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
                console.log(myTrade);
                const updateMyAccount = await Account.findOneAndUpdate({user}, { $inc: {[objectText]: -amount} }, {omitUndefined: true, new: true})
                let allTrades = await LimitTrade.find({pair}).sort({})
                Io.emit(`${pair}-${ALL_LIMIT}`, allTrades);
                Io.emit(`${user}-${UPDATE_ACCOUNT}`, updateMyAccount);
                Io.emit(`${user}-${pair}-${ADD_LIMIT}`, myTrade);
                res.status(200).json({message: 'Your order has been created'})
                // next();
            }
        }else {
            next({message: `You dont have account`})
        }
    };

    static async checkSellLimit(req,res,next) {
        let Io = req.Io;
        let myTrade = req.myTrade;
        let { order_type, first_currency, second_currency } = req.body
        let amount = Number(req.body.amount);
        let price = Number(req.body.price);
        let objectText = generateText(first_currency);
        let objectText2 = generateText(second_currency);

        let filterTrade = await LimitTrade.find({pair, price: {$lte: price}, order_type: 'buy'}).sort({price: 'desc'})
        
        //LOOP filter trade
        if (filterTrade.length > 0) {
                let amountStart = 0;
                let amountLimit = amount;
            for (let i = 0; i < filterTrade.length; i++) {
                let item = filterTrade[i];
                let otherAccount;
                let otherHistory;
                let otherUpdateLimit;
                let myAccount;
                let myHistory;
                let myUpdateLimit;
                let itemTotal = item.amount * item.price;
                amountStart += item.amount;

                if(amountStart < amountLimit) {
                    
                    //OTHERDATA
                    otherHistory = await History.create({user: item.user, amount: item.amout, price: item.price, order_type: item.order_type, pair: item.pair})
                    let { _id } = await LimitTrade.findOneAndDelete({_id: item.id});
                    otherAccount = await Account.findOneAndUpdate({user: item.user}, {
                        $inc: {[objectText]: item.amount}
                    }, {omitUndefined: true, new: true})


                    //MYDATA
                    let filledPlus = amountStart / amountLimit;
                    myHistory = await History.create({user: myTrade.user, amount: item.amount, price: item.price, order_type: myTrade.order_type, pair: myTrade.pair});
                    myAccount = await Account.findOneAndUpdate({user: myTrade.user}, {
                        $inc: {[objectText2]: itemTotal}
                    }, {omitUndefined: true, new: true})
                    myUpdateLimit = await LimitTrade.findOneAndUpdate({user: myTrade.user}, {
                        $inc: {amount: -item.amount, total: itemTotal}, filled: filledPlus
                    }, {omitUndefined: true, new: true})

                    //SOCKET
                    // Io.emit(`${item.user}-${pair}-${ADD_HISTORY}`)

                }else if (amountStart === amountLimit) {

                }else {

                };
            };
        }
    }

    static createBuyMarket(req, res,next) {
        
    }

};

module.exports = TradeController;