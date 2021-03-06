'use strict';

const _ = require('lodash');
const shell = require('shelljs');

const WebSocketServer = require('websocket').server;
const rproxyRouter =  require('./rproxyRouter').rproxyRouter;
const errorRoute = require('./rproxyError').routerError;
const log4js = require('log4js');
const logger = log4js.getLogger('proxyServer');
logger.level = 'trace';

let keyMsConnections = {};

class rproxyServer extends rproxyRouter {

    constructor(router,events) {
        super(router,events);
        let self = this.self = this;
        // Initialize the app.
        this.server = null;
        this.wsServer = null;
    }

    startWsServer(server) {
        let self = this;
        this.server = server;
        this.wsServer = new WebSocketServer({
            httpServer: this.server,
            autoAcceptConnections: false
        });
                
        this.wsServer.on('request', function(request) {
            logger.trace(`wsRequest: ${request.origin}[${request.requestedProtocols}]`);
            let connection = self.evRequest(request,self);
            if (connection && connection.origin.service)
                keyMsConnections[connection.origin.service] = connection;
        });        
    }

    addMicroService(req,res) {
        const proc = _.get(req.body,'proc',null);
        const pid  = _.get(req.body,'pid',null);
        const path = _.get(req.body,'path',null);
        const opts = _.get(req.body,'options',null);
        const uri = 'ws://' + this.server.address().address + this.server.address().port;
        //const cli = `${proc} ${path} --name ${pid} --node-args="${uri}" ${opts}`;
        const cli = `${proc} ${path} ${uri}`;
        logger.trace(`Add App Server path: ${cli}`);
        
        shell.exec(cli,//`${proc} ${path} ${uri}`, 
          function(code, stdout, stderr) {
            logger.error('Exit code:', code);
            logger.trace('Program output:', stdout);
            logger.warn('Program stderr:', stderr);
          });
          
        res.status(200).send({status: 'ok'})
    }

    getAddressServer(req,res) {
        const uri = 'ws://' + this.server.address().address + this.server.address().port;
        res.status(200).send({uri: uri})
    }

    getMicroServicesMap(req,res) {
        const microServices = Object.keys(keyMsConnections);
        logger.trace(`Get Microservices Map: ${JSON.stringify(microServices)}`);
        res.status(200).send({map: microServices});
    }    

/*
target: microservice destnation name
message: {
    type: 'utf8' or 'binary'
    utf8Data: '...' or binaryData: '...'
}
*/
    sendMessage(req,res) {
        const target = _.get(req.body,'target',null);
        const type   = _.get(req.body,'type',null);
        const data   = _.get(req.body,'data',null);

        if (!target)
            res.status(400).send({status: `Bad Request: target`});
        if (!type)
            res.status(400).send({status: `Bad Request: msg type`});
        if (!data)    
            res.status(400).send({status: `Bad Request: msg`});

        if (this.msgSend((type === 'utf8') ? {type: type, utf8Data: data} : 
                                             {type: type, binaryData: data},target)) {
            res.status(200).send({status: 'OK'});
        } else {
            res.status(404).send({status: 'Not Found'});
        }
    }

    msgSend(message,dest) {  
        //logger.debug(`msgSend: ${message.utf8Data}`);
        let target = dest || JSON.parse(message.utf8Data).head.target;
        if (keyMsConnections[target]) {
            if (message.type === 'utf8') {
                keyMsConnections[target].sendUTF(message.utf8Data);
                logger.trace(`- rproxyServer send utf8 msg ${target}: - ${message.utf8Data}`);
                return true;                
            } else if (type === 'binary') {
                keyMsConnections[target].sendBytes(message.binaryData);
                logger.trace(`- rproxyServer send binary msg ${target}: - ${message.binaryData}`);
                return true;
            }
            logger.warn(`- rproxyServer Wrong Message type: ${message.type}`);
            return false;
        } else {
            logger.warn(`- rproxyServer target ${target} not connected`);
            return false;
        }
    }

    runMicroService(ms,uri) {
        const cli = `${ms.config.proc} ${ms.config.script} --uri=${uri} --protocol=${ms.protocol} --name=${ms.name}`;
        logger.trace(`Add Micro Service path: ${cli}`); 
        shell.exec(cli,
          function(code, stdout, stderr) {
            logger.error('Exit code:', code);
            logger.trace('Program output:', stdout);
            logger.warn('Program stderr:', stderr);
        });        
    }

    evMessage(message,connection) {
        let command = JSON.parse(message.utf8Data);
        switch(command.head.target) {
            case 'route':
                logger.trace(`Publish route channel: ${connection.origin.channel}`); 
                super.routeMessage(connection.origin,message); 
            break;
            case 'rproxy':
                logger.trace(`Termination rproxy: ${message.utf8Data}`); 
                super.response(message);
            break;            
            default: 
                if (this.msgSend(message,command.head.target))
                    logger.trace(`Redirect to target: ${command.head.target}`);    
        }
        return command;
    }
    /**
     * Implementation required
     */
    evRequest(request,parent) {
        throw new Error('You have to implement the method doSomething!');
    }
}

//module.exports.rproxyServer = rproxyServer;
module.exports = rproxyServer;