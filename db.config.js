const mongoose = require('mongoose');

// const MONGO_URL = 'mongodb://localhost/exchange-mern-stack';
const MONGO_URL = process.env.MONGO_URI;

const dbConnect = () => {
    mongoose.connect(MONGO_URL, {useNewUrlParser: true, useUnifiedTopology:true, useFindAndModify:true});
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function() {
        console.log(`We are connected to mongoDB :)`)
    });
};

module.exports = dbConnect