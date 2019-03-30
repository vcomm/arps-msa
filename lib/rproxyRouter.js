'use strict';

const rproxyMessage = require('./rproxyMessage');
const errorRoute = require('./rproxyError').routerError;
const log4js = require('log4js');
const logger = log4js.getLogger('proxyRouter');
logger.level = 'trace';

class rproxyRouter extends rproxyMessage {
    constructor(router,events) {
        super('router',events);
        this.router = router;
        this._lib = null;
        this._fsm = null;        
    }

    setServiceConnection(channel,service,connection) {
      try {
         this.router["channels"][channel]["publishers"][service].connection  = connection;
         this.router["channels"][channel]["subscribers"][service].connection = connection;
         logger.trace(`setServiceConnection: -> channel: ${channel}/service: ${service}`);  
         return true;
      } catch(e) {
         // do nothing if there's an error. 
         logger.error(new errorRoute(`setServiceConnection: ERROR ROUTINIG TABLE: ${e} channel: ${channel}/service: ${service}`));   
         return false;
      }
    }

    getServiceConnection(channel,service) {
      try {
         return { 
            publisher : this.router["channels"][channel]["publishers"][service].connection, 
            subscriber: this.router["channels"][channel]["subscribers"][service].connection
         };
      } catch(e) {
         // do nothing if there's an error.
         logger.error(new errorRoute(`getServiceConnection: ERROR ROUTINIG TABLE: channel: ${channel}/service: ${service}`));   
         return null;
      }         
    }

    delServiceConnection(channel,service) {
      try {
         this.router["channels"][channel]["publishers"][service].connection  = null; 
         this.router["channels"][channel]["subscribers"][service].connection = null;
      } catch(e) {
         // do nothing if there's an error.
         logger.error(new errorRoute(`delServiceConnection: ERROR ROUTINIG TABLE: channel: ${channel}/service: ${service}`));   
      }         
    }

    routeMessage(origin,message) {
      try {
         for (const [key, value] of Object.entries(this.router["channels"][origin.channel]["subscribers"])) {
              if (value.type === "service") {
                  logger.trace(`routeMessage from: ${JSON.stringify(origin)} to: ${key}`);
                  if (message.type === 'utf8') {
                      value.connection.sendUTF(message.utf8Data);   
                  } else if (type === 'binary') {
                      value.connection.sendBytes(message.binaryData);
                  }                   
              }   
         }         
      } catch(e) {
         // do nothing if there's an error.
         logger.error(new errorRoute(`routeMessage: ERROR ROUTINIG: ${JSON.stringify(origin)} to subscribers: ${origin.channel} `));   
      }   
    }

    call(fname) { return this._lib[fname] }
 
    runStep(cntx) { super.event(cntx) }
 
    startLogic(cntx) {
       if(cntx.logic && !cntx.complete) {
          this.call(cntx.logic.start.name)(cntx)
       }
    }
 
    stopLogic(cntx) {
       if(cntx.logic && !cntx.complete) {
          this.call(cntx.logic.stop.name)(cntx)
       }
    }

    attachLogic(lname,cntx) {
      this._lib = require('../logic/'+lname); 
      this._fsm = require('../logic/'+lname+'.json');
      super.init(this._fsm,cntx);
    }
}

module.exports.rproxyRouter = rproxyRouter;