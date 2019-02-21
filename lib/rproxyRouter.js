'use strict';

const daFsm = require('dafsm').asyncDafsm;

let context = { }

class rproxyRouter extends daFsm {
    constructor() {
        super('router');
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