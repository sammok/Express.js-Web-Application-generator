var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = {
    mail: String,
    username: String,
    password: String,
    salt: String,
    registrationTime: Date,
    lastTimeLogin: Date,
    avatarPath: String,
    resetPasswordToken: String,
    resetPasswordExpires: Number
};

var user = new Schema(schema);

exports.model = mongoose.model('User', user);
exports.schema = schema;
