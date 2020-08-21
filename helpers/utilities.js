
const generateText = (type) => {
    switch(type) {
        case 'btc':
            return 'BTC_coin';
            break;
        case 'eth':
            return 'ETH_coin';
            break;
        case 'ltc':
            return 'LTC_coin';
            break;
        case 'usd':
            return 'balance';
            break;
        default:
            return false;
    }
};

module.exports = { generateText }