const axios = require('axios');
const { base } = require('../models/user');
const { CRYPTO_TYPE } = require('../helpers/Redis')

class CryptoController {

    static getCryptoData(req,res,next) {
        let redisClient = req.redisClient;
        let baseUrl = 'https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC,ETH,LTC,BNB&tsyms=USD,ETH,LTC,TRX,NEO';
        axios.get(`${baseUrl}`).then(({data}) => {
            redisClient.SETEX(CRYPTO_TYPE, 3600, JSON.stringify(data))
            res.status(200).json(data)
        })
    }

}

module.exports = CryptoController;