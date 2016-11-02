var User = require('../controllers/user');

var tools = require('../lib/tools');
var formidable = require('formidable');
var crypto = require('crypto');
var fs = require('fs');
var request = require('request');
var async = require('async');

exports.getUser = function (app) {
    return function (req, res, next) {
        var username = req.session.user.username;

        User.getUser({username: username}, function (err, user) {
            if (err) return next(err);

            if (!user) return app.responseHelper(res, 404, 'User dose not exist');

            app.responseHelper(res, 200, user);
        });
    };
};

exports.getUserInfo = function (app) {
    return function (req, res, next) {
        User.getUserInfo({username: username}, function (err, user) {
            if (err) return next(err);

            if (!user) return app.responseHelper(res, 404, 'User dose not exist');

            app.responseHelper(res, 200, user);
        });
    };
};

exports.updateUser = function (app) {
    return function (req, res, next) {
        var username = req.session.user.username;
        var data = req.body.user;

        var verificationRule = [
            { rule: 'username', value: username, message: 'UserName' }
        ];

        var verification = tools.verify(verificationRule);

        if (verification.result == false) return app.responseHelper(res, 400, 'Invalid Params: ' + verification.messages);

        var dataForUpdate = {};

        /**  Append field that needs to be update here: */
        // try {
        //     verificationRule = [
        //         { rule: 'username', value: username, message: 'UserName' }
        //     ];
        //
        //     verification = tools.verify(verificationRule);
        //
        //     if (verification.result == false) return app.responseHelper(res, 400, 'Invalid Params: ' + verification.messages);
        //
        //     if (data.description) dataForUpdate.description = data.description;
        // } catch (err) {
        //     next(err);
        // }

        async.waterfall([
            function (cb) {
                User.getUserInfo({username:username}, function (err, user) {
                    if (err) return next(err);

                    if (!user) return app.responseHelper(res, 404, 'The User dose not exist');

                    cb(null, user);
                });
            },
            function (user, cb) {
                User.update(dataForUpdate, user, function (err, user) {
                    if (err) return next(err);

                    if (!user) return app.responseHelper(res, 404, 'The User dose not exist');

                    app.responseHelper(res, 200, user);
                });
            }
        ]);
    };
};

exports.createUser = function (app) {
    return function (req, res, next) {
        var user = req.body.user || {};

        var verificationRule = [
            { rule: 'username', value: user.username, message: 'User Name' },
            { rule: 'mail', value: user.mail, message: 'Mail Address' },
            { rule: 'password', value: user.password, message: 'Password' }
        ];

        var verification = tools.verify(verificationRule);

        if (verification.result == false) return app.responseHelper(res, 400, 'Invalid Params: ' + verification.messages);

        async.waterfall([
            function (cb) {
                User.getUserInfo({username: user.username}, function (err, isUserNameInUsed) {
                    if (err) return next(err);

                    cb(null, isUserNameInUsed);
                });
            },

            function (cb, isUserNameInUsed) {
                User.getUserInfo({mail: user.mail}, function (err, isMaillInUsed) {
                    if (err) return next(err);

                    if (isUserNameInUsed || isMaillInUsed) {
                        var identifierCode = [];
                        isUserNameInUsed && identifierCode.push(4091);
                        isMaillInUsed && identifierCode.push(4092);

                        app.responseHelper(res, { statusCode: 409, identifierCode: identifierCode }, 'UserName or UserMail dose already exist');
                        return;
                    }

                    var newUser = new User ({
                        mail: user.mail,
                        username: user.username,
                        password: user.password,
                        registrationTime: new Date(),
                        isPublic: true
                    });

                    newUser.create(function (err, user) {
                        if (err) return next(err);

                        if (user == 409) return app.responseHelper(res, 409, 'User dose already exist');

                        app.responseHelper(res, 201, 'User has been created successfully', user);
                    });
                });
            }
        ]);
    };
};


exports.avatarUpdate = function (app) {
    return function (req, res, next) {
        var username = req.session.user.username;

        User.getUser({username: username}, function (err, user) {
            if (err) return next(err);

            if (!user) return app.responseHelper(res, 404, 'User dose not exist');

            //  specified uploads dir
            var avatarStaticPath = '/uploads/userAvatars';
            var uploadDir = app.get('staticSource') + avatarStaticPath;

            //  handle incoming form data
            var form = new formidable.IncomingForm();
            form.uploadDir = uploadDir;
            form.maxFieldsSize = 1 * 1024 * 1024;

            var hasBeenResponse = false;

            form.on ('fileBegin', function(name, file){
                var fileType = file.type.split('/').pop();

                if(fileType !== 'jpeg' && fileType !== 'png' ){
                    hasBeenResponse = true;
                    return app.responseHelper(res, 400, 'Wrong upload value');
                }
            });

            //  parse request body data
            form.parse(req, function (err, fields, files) {
                if (hasBeenResponse == false) {
                    if (err) return next(err);

                    /** require a File Field named `photoSrc` */
                    if (!files.photoSrc) {
                        res.status(400);
                        return res.json({result: 'Wrong uploads value'});
                    }

                    files.photoSrc.name = new Date().getTime() + Math.random().toFixed(5)*100000 + '.' + files.photoSrc.type.split('/')[1];
                    fs.rename(files.photoSrc.path, form.uploadDir + '/' + files.photoSrc.name);

                    var oldAvatar;

                    if (user.avatarPath) oldAvatar = app.get('root') + user.avatarPath;

                    user.avatarPath = avatarStaticPath + '/' + files.photoSrc.name;

                    user.save(function (err) {
                        if (err) return next(err);
                        app.responseHelper(res, 200, user.photoSrc);
                        oldAvatar && fs.unlink(oldAvatar);
                    });
                }
            });
        });
    };
};

exports.login = function (app) {
    return function (req, res, next) {
        var data = req.body.user || {};
        var user = data.mail;
        var password = data.password;

        var verification = tools.verify([
            {rule: 'mail', value: user, message: 'User address'},
            {rule: 'password', value: password}
        ]);

        if (verification.result == false) return app.responseHelper(res, 400, 'Invalid Params: ' + verification.messages);

        User.authenticate(user, password, function (err, user) {
            if (err) return next(err);

            if (user == 404) return app.responseHelper(res, 404, 'User dose not exists');
            else if (user == 403) return app.responseHelper(res, 403, 'Invalid UserName or Password');

            req.session.user = {
                id: user._id.toString(),
                username: user.username
            };

            var hour = 3600000;
            req.session.cookie.expires = new Date(Date.now() + hour*24*7);

            app.responseHelper(res, 200, {
                id: user._id.toString(),
                username: user.username
            });

            //  update user last time login
            user.lastTimeLogin = new Date();
            user.save(function (err, user) {});
        });
    }
};

exports.logout = function (app) {
    return function (req, res, next) {
        if (req.session.user) {
            req.session.destroy(function (err) {
                if (err) return next(err);
                return app.responseHelper(res, 200, 'Logout success');
            });

            return;
        }

        return app.responseHelper(res, 200, 'Logout success');
    }
};

exports.checkUserExistance = function (app) {
    return function (req, res, next) {
        var username = req.query.username;
        var mail = req.query.mail;

        var verificationRule = [
            { rule: 'username', value: username, message: 'User Name' },
            { rule: 'mail', value: mail, message: 'User Mail' }
        ];

        var verification = tools.verify(verificationRule);

        if (verification.result == false) return app.responseHelper(res, 400, 'Invalid Params: ' + verification.messages);

        async.parallel([
            function (cb) {
                User.getUserInfo({username:username}, function (err, userNameInUsed) {
                    if (err) return cb(err);

                    cb(null, !!userNameInUsed);
                });
            },

            function (cb) {
                User.getUserInfo({mail:mail}, function (err, userMailInUsed) {
                    if (err) return cb(err);

                    cb(null, !!userMailInUsed);
                });
            }
        ],

        function (err, results) {
            if (results[0] || results[1]) {
                var identifierCode = [];
                results[0] && identifierCode.push(4091);
                results[1] && identifierCode.push(4092);

                app.responseHelper(res, { statusCode: 409, identifierCode: identifierCode }, 'UserName or UserMail dose already exist');
                return;
            }

            app.responseHelper(res, 200, 'User are not exist, can be create');
        });
    };
};

exports.forgotPassword =
exports.resendResetPasswordMail = function (app) {
    return function (req, res, next) {
        var mail = req.query.mail;

        var verificationRule = [
            { rule: 'mail', value: mail, message: 'Mail' }
        ];

        var verification = tools.verify(verificationRule);

        if (verification.result == false) return app.responseHelper(res, 400, 'Invalid Params: ' + verification.messages);

        sendPasswordResetMail(mail, res, next, app);
    };
};

exports.resetPassword = function (app) {
    return function (req, res, next) {
        var data = req.body;
        var token = data.token;
        var mail = data.mail;
        var newPassword = data.newPassword;

        var verificationRule = [
            { rule: 'mail', value: mail, message: 'Mail' },
            { rule: 'password', value: newPassword, message: 'newPassword' }
        ];

        var verification = tools.verify(verificationRule);

        if (verification.result == false) return app.responseHelper(res, 400, 'Invalid Params: ' + verification.messages);

        async.waterfall([
            function (cb) {
                User.getUserTokenByMail(mail, function (err, user) {
                    if (err) return next(err);

                    if (!user) return app.responseHelper(res, 404, 'User dose not exists');

                    //  invalid Token or Token was expired
                    if (user.resetPasswordToken !== token || user.resetPasswordExpires < Date.now()) {
                        app.responseHelper(res, 400, 'The Token was expired');
                        return;
                    }

                    cb(null, user);
                });
            }, function (user, cb) {
                User.resetPassword(user, newPassword, function (err, user) {
                    if (err) return next(err);

                    user.resetPasswordToken = null;
                    user.resetPasswordExpires = null;

                    user.save(function (err, user) {
                        if (err) return next(err);

                        app.responseHelper(res, 200, 'Changed new Password');
                    });
                });
            }
        ]);
    }
};

exports.changePassword = function (app) {
    return function (req, res, next) {
        var username = req.session.user.username;
        var data = req.body;
        var currentPassword = data.currentPassword;
        var newPassword = data.newPassword;

        var verificationRule = [
            { rule: 'username', value: username, message: 'UserName' },
            { rule: 'password', value: newPassword, message: 'newPassword' }
        ];

        var verification = tools.verify(verificationRule);

        if (verification.result == false) return app.responseHelper(res, 400, 'Invalid Params: ' + verification.messages);

        async.waterfall([
            function (cb) {
                User.getUserInfo({username:username}, function (err, user) {
                    if (err) return next(err);

                    if (!user) return app.responseHelper(res, 404, 'User are not exist');

                    cb(null, user);
                });
            },

            function (user, cb) {
                User.authenticate(user.mail, currentPassword, function (err, user) {
                    if (err) return next(err);

                    if (!user) return app.responseHelper(res, 404, 'User are not exist');

                    if (user == 403) return app.responseHelper(res, 403, 'Password Error');

                    cb(null, user);
                });
            },

            function (user, cb) {
                User.resetPassword(user, newPassword, function (err, user) {
                    if (err) return next(err);

                    user.save(function (err, user) {
                        if (err) return next(err);

                        app.responseHelper(res, 200, 'Password changed');
                    });
                });
            }
        ]);


    }
};

exports.sendDeleteUserTokenMail = function (app) {
    return function (req, res, next) {
        var username = req.session.user.username;

        var verificationRule = [
            { rule: 'username', value: username, message: 'UserName' }
        ];

        var verification = tools.verify(verificationRule);

        if (verification.result == false) return app.responseHelper(res, 400, 'Invalid Params: ' + verification.messages);

        User.getUserInfo({username:username}, function (err, user) {
            if (err) return next(err);

            if (!user) return app.responseHelper(res, 404, 'User are not exist');

            sendDeleteAccountMail(user.mail, res, next, app);
        });
    };
};

exports.deleteUser = function (app) {
    return function (req, res, next) {
        var username = req.session.user.username;
        var data = req.body;
        var token = data.token;

        var verificationRule = [
            { rule: 'username', value: username, message: 'UserName' }
        ];

        var verification = tools.verify(verificationRule);

        if (verification.result == false) return app.responseHelper(res, 400, 'Invalid Params: ' + verification.messages);

        async.waterfall([
            function (cb) {
                User.getDeleteAccountTokenByUserName(username, function (err, user) {
                    if (err) return next(err);

                    if (!user) return app.responseHelper(res, 404, 'User dose not exists');

                    //  invalid Token or Token was expired
                    if (user.deleteAccountToken !== token || user.deleteAccountExpires < Date.now()) {
                        app.responseHelper(res, 400, 'The Token was expired');
                        return;
                    }

                    cb(null, user);
                });
            }, function (user, cb) {
                User.getUser({username: username}, function (err, user) {
                    if (err) return next(err);

                    if (!user) return app.responseHelper(res, 404, 'User are not exist');

                    User.deleteUser(user, app, function (err) {
                        if (err) return app.responseHelper(res, 500, 'Internal Server Error, Delete User Failed');

                        req.session.destroy(function (err) {
                            app.responseHelper(res, 200, 'Bye!');
                        });
                    });
                });
            }
        ]);
    };
};

function sendPasswordResetMail (mail, res, next, app) {
    User.getUserTokenByMail(mail, function (err, user) {
        if (err) return next(err);

        if (!user) return app.responseHelper(res, 404, 'User dose not exists');

        //  Token dose not exist or Token was expired
        if (!user.resetPasswordToken || user.resetPasswordExpires < Date.now()) {
            //  regenerate Token then send reset Password Mail
            async.waterfall([
                function(done) {
                    crypto.randomBytes(20, function(err, buf) {
                        var token = buf.toString('hex');
                        done(err, token);
                    });
                },
                function(token, done) {
                    user.resetPasswordToken = token;
                    user.resetPasswordExpires = Date.now() + 3600000 * 24; // 24 hours

                    user.save(function(err) {
                        done(err, token, user);
                    });
                },
                function(token, user, done) {
                    resendMail();
                }
            ], function(err) {
                if (err) return next(err);
            });
        } else {
            resendMail();
        }

        function resendMail () {
            // resend reset Password Mail
            request.post({
                url: 'http://your-mail-server.com/sendResetPasswordMail',
                json: true,
                body: {
                    mail: {
                        from: 'passport@oneande.com',
                        to: user.mail,
                        subject: '重置您的密码 - <产品名字>',
                        body: '<div class="container" style="padding-top:20px; margin:0 auto"><div class="main" style="border:1px solid #d9d9d9; border-top:none; margin-bottom:25px; text-align:center"><div class="go_home" style="margin:0 auto 32px;text-align:right;font-size:12px;border-top: 3px solid #92cd71;padding-top:15px;"><a href="http://1e.sg" style="margin-right:15px; color:#b1b1b1; text-decoration:initial" target="_blank"><img style="width:16px; margin-right:3px; vertical-align:text-top" src="http://cdn-qn0.jianshu.io/assets/mail_home-575470ce48eddfc882e1c8d8ce1a2b1b.jpg">进入网站</a></div><div class="header" style="width:100%;margin:0 auto 15px;color: #92cd71;font-weight: bold;font-size: 33px;line-height: 1.45rem;"><产品名字></div><h2 style="margin:30px 0">' + user.username + ', 您好,</h2><div class="content" style="border-top:1px solid #d9d9d9; padding:30px 50px 30px; margin:0 30px; word-break:break-all; line-height:1.8"><p>您可以通过下面的链接重置您的密码: </p><a href="' + app.get('config').client + '/user/password/reset?token=' + user.resetPasswordToken + '&' + 'mail=' + user.mail + '" style="font-size:14px;background: #92cd71;color:#fff;padding:9px 14px;margin-bottom:10px;text-decoration:none;border-radius:2px;display:inline-block;" target="_blank">重置密码</a><p>如果您未发起这次重置密码, 请忽略这封邮件。</p><p>如果您不点击上面的链接, 并且设置新密码的话, 您的密码不会被更改。</p></div></div><div class="footer" style="font-size:12px; text-align:center; color:#999"><p>© <span style="border-bottom:1px dashed #ccc;z-index:1" t="7" onclick="return false;" data="2016">2016</span><产品名字></p></div></div>'
                    }
                }
            }, function (err, response, body) {
                if (err) return next(err);

                if (!response) {
                    res.status(500);
                    return res.json({result: 'Internal Server Error'});
                }

                app.responseHelper(res, 201, 'The Mail has been send');
            });
        }
    })
}

function sendDeleteAccountMail (mail, res, next, app) {
    User.getUserTokenByMail(mail, function (err, user) {
        if (err) return next(err);

        if (!user) return app.responseHelper(res, 404, 'User dose not exists');

        //  Token dose not exist or Token was expired
        if (!user.deleteAccountToken || user.deleteAccountExpires < Date.now()) {
            //  regenerate Token then send delete Account Mail
            async.waterfall([
                function(done) {
                    crypto.randomBytes(20, function(err, buf) {
                        var token = buf.toString('hex');
                        done(err, token);
                    });
                },
                function(token, done) {
                    user.deleteAccountToken = token;
                    user.deleteAccountExpires = Date.now() + 3600000 * 24; // 24 hours

                    user.save(function(err) {
                        done(err, token, user);
                    });
                },
                function(token, user, done) {
                    resendMail();
                }
            ], function(err) {
                if (err) return next(err);
            });
        } else {
            resendMail();
        }

        function resendMail () {
            // resend reset Password Mail
            request.post({
                url: 'http://your-mail-server.com:/sendDeleteAccountMail',
                json: true,
                body: {
                    mail: {
                        from: 'passport@oneande.com',
                        to: user.mail,
                        subject: '删除账户 - <产品名字>',
                        body: '<div class="container" style="padding-top:20px; margin:0 auto"><div class="main" style="border:1px solid #d9d9d9; border-top:none; margin-bottom:25px; text-align:center"><div class="go_home" style="margin:0 auto 32px;text-align:right;font-size:12px;border-top: 3px solid #92cd71;padding-top:15px;"><a href="http://1e.sg" style="margin-right:15px; color:#b1b1b1; text-decoration:initial" target="_blank"><img style="width:16px; margin-right:3px; vertical-align:text-top" src="http://cdn-qn0.jianshu.io/assets/mail_home-575470ce48eddfc882e1c8d8ce1a2b1b.jpg">进入网站</a></div><div class="header" style="width:100%;margin:0 auto 15px;color: #92cd71;font-weight: bold;font-size: 33px;line-height: 1.45rem;"><产品名字></div><h2 style="margin:30px 0">' + user.username + ', 您好,</h2><div class="content" style="border-top:1px solid #d9d9d9; padding:30px 50px 30px; margin:0 30px; word-break:break-all; line-height:1.8"><p>您可以通过下面的链接删除您的账户: </p><a href="' + app.get('config').client + '/settings?token=' + user.deleteAccountToken +'#destroy" style="font-size:14px;background: #92cd71;color:#fff;padding:9px 14px;margin-bottom:10px;text-decoration:none;border-radius:2px;display:inline-block;" target="_blank">删除账户</a><p>如果您未发起这次删除账户的请求, 请忽略这封邮件。</p><p>如果您不点击上面的链接, 并且在新页面确认删除账户的话, 您的账户不会被删除。</p></div></div><div class="footer" style="font-size:12px; text-align:center; color:#999"><p>© <span style="border-bottom:1px dashed #ccc;z-index:1" t="7" onclick="return false;" data="2016">2016</span><产品名字></p></div></div>'
                    }
                }
            }, function (err, response, body) {
                if (err) return next(err);

                if (!response) {
                    res.status(500);
                    return res.json({result: 'Internal Server Error'});
                }

                app.responseHelper(res, 201, 'The Mail has been send');
            });
        }
    })
}
