'use strict';

const daFsm = require('dafsm').asyncDafsm;
//const errorRoute = require('./rproxyError').routerError;
const log4js = require('log4js');
const logger = log4js.getLogger('proxyMessage');
logger.level = 'trace';

class rproxyMessage extends daFsm {
    constructor() {
        super('message');
        this._lib = null;
        this._fsm = null;        
    }


}

module.exports = rproxyMessage;