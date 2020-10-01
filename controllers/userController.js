const User = require('../models/user');
const { checkHashingPass } = require('../helpers/hashPassword');
const { generateToken, verifyToken } = require('../helpers/jwt');


class UserController {

    static readAll(req,res,next) {
        User.find({}).then(users => res.status(200).json(users)).catch(err => next(err));
    };

    static readMe(req,res,next) {
        let user = req.decoded.id;
        User.findOne({_id: user}).populate('account').then(user => res.status(200).json(user)).catch(err => next(err));
    };

    static create(req,res,next) {
        let { email, full_name, password, confirm_password } = req.body;
        User.create({email, full_name, password, confirm_password})
            .then(user => {
                res.status(202).json({message: "Thank you for registering"})
            })
            .catch(err => next(err))
    };

    static login(req, res, next) {
        let { email, password } = req.body;
        User.findOne({email}).populate('account')
            .then(user => {
                if (user) {
                    let result = checkHashingPass(password, user.password);
                    if (result) {
                        let token = generateToken({id: user.id});
                        // res.cookie('XSRF-TOKEN', req.csrfToken());
                        // res.cookie("exchangetoken", token);
                        res.status(202).json({message: `Welcome ${user.full_name}`, user, token});
                    }else {
                        next({message: "Invalid email / password"})
                    }
                }else {
                    next({message: "Invalid email / password"})
                }
            })
    };

    static logout(req,res,next) {
        res.clearCookie(`exchangetoken`)
        res.status(200).json({message: "You are logout"})
    };

    static checkAuth(req,res,next) {
        let token = req.cookies.exchangetoken;
        if (token) {
            let { id } = verifyToken(token);
            User.findOne({_id: id}).populate('account')
                .then(user => {
                    res.status(200).json(user);
                })
        }else {
            res.status(400).json({message: "You must login first"})
        }
    };

};

module.exports = UserController;