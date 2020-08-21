const mongoose = require('mongoose');

const limitTradeSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    pair: {type: String, required: [true, "pair must be not empty"]},
    order_type: {type: String, required: [true, "Type cannot be empty"]},
    amount_limit: {type: Number, required: [true, "Wrong Input"]},
    total: {type: Number, required: [true, "Wrong Input"]},
    price: {type: Number, required: [true, "Wrong Input"]},
    amount: {type: Number, required: [true, "Wrong Input"]},
    first_currency: {type: String, required: [true, "Wrong Input"]},
    second_currency:{type: String, required: [true, "Wrong Input"]},
    amount_start: {type: Number, default: 0},
    filled: {
        type: Number, default: 0
    }
}, {versionKey: false, timestamps: {createdAt: 'createdAt'}});

module.exports = mongoose.model('LimitTrade', limitTradeSchema);