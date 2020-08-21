const mongoose = require('mongoose');
const { hashingPass } = require('../helpers/hashPassword')

const userSchema = new mongoose.Schema({
    full_name: {type: String, required: [true, 'Full name cannot be empty']},
    email: {
        type: String,
        required: [true, 'Email cannot be empty'],
        validate: [
            {validator: function (value) {
                const emailRegex = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
                return emailRegex.test(value);
            }, message: props => `${props.value} is not valid email`},
            {validator: function (value) {
                return this.model('User').findOne({email: value})
                    .then(result => {
                        if (result) {
                            return false;
                        }else {
                            return true;
                        }
                    })
            }, message: props => `${props.value} already taken`}
        ]
    },
    password: {type: String, required: [true, 'Password cannot be empty']},
    confirm_password: {type: String, required: [true, 'Confirm passoword cannot be empty']},
    account: {type: mongoose.Schema.Types.ObjectId, ref: 'Account'}
}, {versionKey:false, timestamps: {createdAt: 'createdAt'}})

userSchema.pre('save', function (next) {
    if (this.password != this.password) {
        next({message: "Your password and confirm password didnt match"})
    }else {
        let pass = this.password;
        let confirm_password = this.confirm_password;
        this.confirm_password = hashingPass(pass);
        this.password = hashingPass(pass);
        next();
    }
});

module.exports = mongoose.model('User', userSchema);