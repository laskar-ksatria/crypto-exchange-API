const WebSocket = require('ws');

const apiKey = process.env.CRYPTO_COMPARE_API_KEY;

const ccStreamer = new WebSocket('wss://streamer.cryptocompare.com/v2?api_key=' + apiKey);

function walkingWithWebSocket(Io) {
    ccStreamer.on('open', function open() {
        var subRequest = {
            "action": "SubAdd",
            "subs": ["5~CCCAGG~BTC~USD", "5~CCCAGG~BTC~ETH", "5~CCCAGG~ETH~USD", "5~CCCAGG~BTC~LTC"]
        };
        ccStreamer.send(JSON.stringify(subRequest));
    });

    ccStreamer.on('message', function incoming(data) {
        let { PRICE, FROMSYMBOL, TOSYMBOL } = JSON.parse(data);
        if (PRICE && FROMSYMBOL && TOSYMBOL) {
            Io.emit(`${FROMSYMBOL}${TOSYMBOL}-price`, PRICE);
        }
    });
};

module.exports = walkingWithWebSocket;