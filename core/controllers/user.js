var UserModel = require("mongoose").model('User');
var bcrypt = require('bcryptjs');
var fs = require('fs');
var async = require('async');

function User (obj) {
    for (var i in obj) {
        this[i] = obj[i];
    }
}

User.prototype.create = function (fn) {
    var user = this;

    UserModel.findOne({ username: this.username }).exec(function (err, userExists) {
            if (err) return fn(err);
            if (userExists) return fn(null, 409);

            //  generate hashPassword
            user.hashPassword(function () {
                var userData = new UserModel(user);
                userData.save(user, function (err, user) {
                    if (err) return fn(err);
                    fn(null, user);
                });
            });
        });
};

User.prototype.hashPassword = function (fn) {
    var user = this;
    bcrypt.genSalt(2, function(err, salt) {
        if (err) return fn(err);
        user.salt = salt;

        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) return fn(err);
            user.password = hash;
            fn();
        });
    });
};

User.authenticate = function (mail, pass, fn) {
    UserModel.findOne({ mail: mail }).exec(function (err, user) {
        if (err) return fn(err);
        if (!user) return fn(err, 404);
        bcrypt.hash(pass, user.salt, function (err, hash) {
            if (err) return fn(err);
            if (user.password == hash) return fn(null, user);
            fn(err, 403);
        });
    });
};

User.getUserInfo = function (queryConfig, fn) {
    var query = {};

    UserModel
        .findOne(query, { mail: 1, username: 1, registrationTime: 1, lastTimeLogin: 1, avatarPath: 1 })
        .exec(function (err, user) {
            if (err) return fn(err);
            fn(null, user);
        });
};

User.getUser = function (queryConfig, fn) {
    var query = {};

    if (queryConfig.username) query.username = queryConfig.username;

    UserModel
        .findOne(query, { salt: 0, password: 0 })
        .exec(function (err, user) {
            if (err) return fn(err);
            fn(null, user);
        });
};

User.getUserTokenByMail = function (mail, fn) {
    UserModel
        .findOne({mail: mail}, {
            username: 1,
            mail: 1,
            resetPasswordToken: 1,
            resetPasswordExpires: 1
        })
        .exec(function (err, user) {
            if (err) return fn(err);
            fn(null, user);
        });
};

User.getDeleteAccountTokenByUserName = function (username, fn) {
    UserModel
        .findOne({username: username}, {
            username: 1,
            mail: 1,
            deleteAccountToken: 1,
            deleteAccountExpires: 1
        })
        .exec(function (err, user) {
            if (err) return fn(err);
            fn(null, user);
        });
};

User.update = function (dataForUpdate, user, fn) {
    for (var i in dataForUpdate) {
        if (dataForUpdate[i] != user[i]) user[i] = dataForUpdate[i];
    }

    user.save(function (err, user) {
        if (err) return fn(err);
        fn(null, user);
    });
};

User.resetPassword = function (user, password, fn) {
    bcrypt.genSalt(2, function(err, salt) {
        if (err) return fn(err);
        user.salt = salt;

        bcrypt.hash(password, salt, function (err, hash) {
            if (err) return fn(err);
            user.password = hash;
            fn(null, user);
        });
    });
};

module.exports = User;
