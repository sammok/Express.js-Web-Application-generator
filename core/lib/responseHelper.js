const ENVIRONMENT = process.env.NODE_ENV;

module.exports = function (res, statusCode, resultForProduction, resultForDevelopment) {
    var responseResult = {};

    /**
     * @params statusCode {Number | Object}
     * is a  {Number} the value is a StatusCode
     * is an {Object} the value has two properties for provide more status information to client-side:
     *               statusCode = { statusCode: Number, identifierCode: Number }
     * */
    if (typeof statusCode === 'number') {
        res.statusCode = statusCode;
    } else {
        res.statusCode = statusCode.statusCode;
        responseResult.identifierCode = statusCode.identifierCode;
    }

    if (ENVIRONMENT == 'production') {
        responseResult.result = resultForProduction;
    } else {
        responseResult.result = resultForDevelopment || resultForProduction;
    }

    res.json(responseResult);
};
