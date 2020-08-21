const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    pair: {type: String, required: [true, "Pair cannot be empty"]},
    order_type: {type: String, required: [true, "Order type cannot be empty"]},
    amount: {type: String, required: [true, "Amount cannot be empty"]},
    price: {type: String, required: [true, "Wrong input"]}
}, {versionKey: false, timestamps: {createdAt: 'createdAt'}})

module.exports = mongoose.model('History', historySchema);
