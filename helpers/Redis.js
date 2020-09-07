//Redis type
const CRYPTO_TYPE = 'crypto-cache-redis'


const verifyCryptoRedis = (client, cb) => {
    client.get(CRYPTO_TYPE, function (err, data) {
        if (err) throw err;

        cb(data);
    })
};

module.exports = { verifyCryptoRedis, CRYPTO_TYPE }