'use strict';
/*
const utils = require('utils');

function routerError(message) {
    this.message = message;
}
utils.inherits(routerError,Error);
routerError.prototype.name = 'routerError';
*/

class routerError extends Error {
    constructor(args){
        super(args);
        this.name = "routerError";
        Error.captureStackTrace(this, routerError);
    }
}

module.exports = {
    routerError: routerError
}