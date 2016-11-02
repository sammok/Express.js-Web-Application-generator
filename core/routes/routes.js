module.exports = function (app) { 
    var express = require('express');
    var router = express.Router();

    //  routers
    var user = require('./user');

    //  tools
    var auth = require('../lib/auth');
    app.responseHelper = require('../lib/responseHelper');

    //  restrict api
    router.all(/\/api/, auth.restrict(app));

    //  user
    router.get('/user/logout', user.logout(app));
    router.get('/api/user/makeDeleteAccountRequest', user.sendDeleteUserTokenMail(app));
    router.get('/user/checkUserExistance', user.checkUserExistance(app));
    router.get('/user/resendResetPasswordMail', user.resendResetPasswordMail(app));
    router.get('/api/user/information/:username', user.getUserInfo(app));
    router.get('/user/:username', user.getUser(app));
    router.post('/user', user.createUser(app));
    router.post('/user/forgortPassword', user.forgotPassword(app));
    router.post('/user/login', user.login(app));
    router.post('/api/user/changePassword', user.changePassword(app));
    router.put('/user/resetPassword', user.resetPassword(app));
    router.put('/api/user/avatar', user.avatarUpdate(app));
    router.put('/api/user', user.updateUser(app));
    router.delete('/api/user', user.deleteUser(app));

    return router;
};
