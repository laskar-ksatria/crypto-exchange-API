const { verifyCryptoRedis } = require('../helpers/Redis');

const cryptoCache = (req,res,next) => {
    let client = req.redisClient;
    verifyCryptoRedis(client, function (data) {
        if (data) {
            res.status(200).json(JSON.parse(data));
        }else {
            next();
        }
    })
};


module.exports = { cryptoCache };