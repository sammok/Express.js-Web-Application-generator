exports.restrict = function (app) {
    return function (req, res, next) {
        if (!req.session.user.username) {
            res.status(403);
            res.json({result: 'Unauthorized, Please Login'});
        } else {
            next();
        }
    }; 
};