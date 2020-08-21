const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    BTC_coin: {type: Number, default: 30},
    ETH_coin: {type: Number, default: 30},
    LTC_coin: {type: Number, default: 30},
    balance: {type: Number, default: 10000},
})

const account = mongoose.model('Account', accountSchema);

module.exports = account;