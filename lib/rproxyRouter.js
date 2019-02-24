'use strict';

const daFsm = require('dafsm').asyncDafsm;

let context = { }

class rproxyRouter extends daFsm {
    constructor() {
        super('router');
        this.router = require('../config/default.json').router;
        this._lib = {
            fn_initialize: function(cntx) { }
           ,fn_finishing: function(cntx) { }
           ,ev_outOfService: function(cntx) { }
           ,fn_outOfServiceMsg: function(cntx) { }
           ,ev_checkEnvComplete: function(cntx) { }
           ,fn_updateRouteTbl: function(cntx) { }
           ,fn_parsingMsg: function(cntx) { }
           ,fn_keepAlive: function(cntx) { }
           ,fn_routingResponse: function(cntx) { }
           ,ev_clientReqConnection: function(cntx) { }
           ,fn_addClentToRouteTbl: function(cntx) { }
           ,ev_clientReqDisconnect: function(cntx) { }
           ,fn_remClentFromRouteTbl: function(cntx) { }
           ,ev_recvMsg: function(cntx) { }
           ,fn_extractHeaderMsg: function(cntx) { }
           ,fn_prepareRouteHeader: function(cntx) { }
           ,fn_inspectRouteHeader: function(cntx) { }
           ,ev_routeIsFalse: function(cntx) { }
           ,fn_prepareErrorMsg: function(cntx) { }
           ,ev_routeIsTrue: function(cntx) { }
           ,fn_prepareResponseMsg: function(cntx) { }
           ,fn_finallyReport: function(cntx) { }
          }
      //  console.log(`Routing table: -> ${JSON.stringify(this.router)}`);   
    }

    setServiceConnection(channel,service,connection) {
      try {
         this.router["channels"][channel]["publishers"][service].connection  = connection;
         this.router["channels"][channel]["subscribers"][service].connection = connection;
         console.log(`setServiceConnection: -> channel: ${channel}/service: ${service}`);  
         return true;
      } catch(e) {
         // do nothing if there's an error.
         console.error(`setServiceConnection: ERROR ROUTINIG TABLE: channel: ${channel}/service: ${service}`);   
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
         console.error(`getServiceConnection: ERROR ROUTINIG TABLE: channel: ${channel}/service: ${service}`);   
         return null;
      }         
    }

    delServiceConnection(channel,service) {
      try {
         this.router["channels"][channel]["publishers"][service].connection  = null; 
         this.router["channels"][channel]["subscribers"][service].connection = null;
      } catch(e) {
         // do nothing if there's an error.
         console.error(`delServiceConnection: ERROR ROUTINIG TABLE: channel: ${channel}/service: ${service}`);   
      }         
    }

    routeMessage(origin,message) {
      try {
         for (const [key, value] of Object.entries(this.router["channels"][origin.channel]["subscribers"])) {
              if (value.type === "service") {
                  console.log(`routeMessage from: ${JSON.stringify(origin)} to: ${key}`);
                  if (message.type === 'utf8') {
                      value.connection.sendUTF(message.utf8Data);   
                  } else if (type === 'binary') {
                      value.connection.sendBytes(message.binaryData);
                  }                   
              }   
         }         
      } catch(e) {
         // do nothing if there's an error.
         console.error(`routeMessage: ERROR ROUTINIG: ${JSON.stringify(origin)} to subscribers: ${origin.channel} `);   
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
}

module.exports.rproxyRouter = rproxyRouter;