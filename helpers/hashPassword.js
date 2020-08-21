const bcr = require('bcryptjs');

const hashingPass = (password) => {
    return bcr.hashSync(password, bcr.genSaltSync(10))
};

const checkHashingPass = (password, hash) => {
    return bcr.compareSync(password, hash);
};

module.exports = { hashingPass, checkHashingPass }