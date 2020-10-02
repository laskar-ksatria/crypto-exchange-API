const WebSocket = require('ws');

const apiKey = process.env.CRYPTO_COMPARE_API_KEY;

const ccStreamer = new WebSocket('wss://streamer.cryptocompare.com/v2?api_key=' + apiKey);

function walkingWithWebSocket(Io) {
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

module.exports = walkingWithWebSocket;