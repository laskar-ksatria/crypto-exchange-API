require('dotenv').config();

const PORT = process.env.PORT;
const cors = require('cors');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const Io = require('socket.io')(server);
const cookieParser = require('cookie-parser');

//Db connect
require('./db.config')();


// const whiteList = ["http://localhost:3000", "http://localhost:3001"];

// app.use(cors({ credentials: true, origin: whiteList }));
app.use(cors())
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use((req,res,next) => {
    req.Io = Io;
    next();
});
app.use(require('./routes'))

app.use(require('./middlewares/errorHandler'));

const WebSocket = require('ws');

const apiKey = process.env.CRYPTO_COMPARE_API_KEY;

const ccStreamer = new WebSocket('wss://streamer.cryptocompare.com/v2?api_key=' + apiKey);

function walkingWithWebSocket() {
    ccStreamer.on('open', function open() {
        var subRequest = {
            "action": "SubAdd",
            "subs": ["2~Coinbase~BTC~USD", "2~Coinbase~LTC~USD", "2~Coinbase~ETH~USD", "2~Coinbase~BNB~USD"]
        };
        ccStreamer.send(JSON.stringify(subRequest));
    });
    ccStreamer.on('message', function incoming(data) {
        let { PRICE, FROMSYMBOL, TOSYMBOL, VOLUME24HOUR } = JSON.parse(data);
        if (PRICE && FROMSYMBOL && TOSYMBOL, VOLUME24HOUR) {
            console.log(PRICE)
            Io.emit(`realtime-price`, {PRICE, FROMSYMBOL, TOSYMBOL, VOLUME24HOUR});
        }
    });
};

walkingWithWebSocket();

server.listen(PORT, () => console.log(`Server started on ${PORT}`))

Io.on('connection', socket => {
    socket.on(`disconnect`, () => {})
});
