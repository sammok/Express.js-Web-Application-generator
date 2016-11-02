function factory () {
    var tools = {};

    tools.verify = verify;

    tools.getStringLength = getStringLength;

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = tools;
        }
    }

    function verify (data) {
        var mailReg = new RegExp('^(\\w|\\-){1,30}@(\\w|\\-){1,20}.[a-z]{1,8}$');
        //  support Chinese
        var usernameReg = /(\w|_|[\u4E00-\u9FA5]){2,15}/;
        var mongoIDReg = new RegExp('^[0-9a-fA-F]{24}$');
        var passwordReg = /(\w|-|\.|~|!|@|#|$|%|\^|&|\*|\+){6,20}/;
        var result = true;
        var messages = [];
        var obj_toStr = Object.prototype.toString;

        if (obj_toStr.call(data) == '[object Array]') {
            data.forEach(function (data) {
                if (runVerification(data) == false) result = false;
            });
        } else {
            result = runVerification(data);
        }

        function runVerification (data) {
            var result;

            //  if verification rule is a RegExp
            if (obj_toStr.call(data.rule) == '[object RegExp]') {
                result = data.rule.test(data.value);
                !result && messages.push(data.message || '');
                return result;
            }

            //  if verification rule is a Function
            if (obj_toStr.call(data.rule) == '[object Function]') {
                result = data.rule(data.value);
                !result && messages.push(data.message || '');
                return result;
            }

            switch (data.rule) {
                case "mail":
                    result = mailReg.test(data.value ? data.value.toLowerCase() : '');
                    !result && messages.push(data.message || "Mail Address");
                    break;
                case "username":
                    result = usernameReg.test(data.value ? data.value.toLowerCase() : '');
                    !result && messages.push(data.message || "UserName");
                    break;
                case "password":
                    result = passwordReg.test(data.value ? data.value.toLowerCase() : '');
                    !result && messages.push(data.message || "Password");

                    break;
                case "url":
                    result = urlReg.test(data.value ? data.value.toLowerCase() : '');
                    !result && messages.push(data.message || "URL");
                    break;
                case "mongoID":
                    result = mongoIDReg.test(data.value || '');
                    !result && messages.push(data.message || "Mongodb ID");
                    break;
                case "date":
                    result = obj_toStr.call(data.value) == '[object Date]' && data.value.toString() !== 'Invalid Date';
                    !result && messages.push(data.message || "Date");
                    break;
                case "content":
                    result = (obj_toStr.call(data.value) == '[object String]') &&
                        (data.value.length > 0) &&
                        (data.value.length <= (data.lenthLimit || 1024*5));
                    !result && messages.push(data.message || "Content can not be empty");
                    break;
                case "array":
                    result = obj_toStr.call(data.value) == '[object String]';
                    !result && messages.push(data.message || "is not An Array");
                    break;
                default:
                    result = false;
            }

            return result;
        }

        return {
            result: result,
            messages: ': ' + messages.join(', ')
        };
    }

    function getStringLength (str) {
        var len = 0;

        for (var i = 0; i < str.length; i++) {
            if (str.charCodeAt(i) > 127 || str.charCodeAt(i) == 94) {
                len += 1;
            } else {
                len += 0.5;
            }
        }

        return Math.ceil(len);
    }
    
    // Just return a value to define the module export.
    return tools;
}

/** UMD */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['tools'], factory);
    } else if (typeof exports === 'object') {
        // NODE
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.tools = factory();
    }
}(this, factory));