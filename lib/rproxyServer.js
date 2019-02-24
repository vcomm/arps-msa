'use strict';

const _ = require('lodash');
const shell = require('shelljs');
const jsonfile = require('jsonfile');

const https = require('https');
const fs = require('fs')

const WebSocketServer = require('websocket').server;
const rproxyRouter =  require('./rproxyRouter').rproxyRouter;
const routerTable =  require('../config/default.json').rproxyrouter;

let keyMsConnections = {};

class rproxyServer extends rproxyRouter {

    constructor(app,port) {
        super();
        let self = this.self = this;
        // Initialize the app.
        this.wsServer = null;
        this.server = app.listen(port, function () {    
            console.log((new Date()) + "Server now running on port", self.server.address());
            routerTable.uri = 'ws://' + self.server.address().address + self.server.address().port;
            jsonfile.writeFile('./config/rvproxy.json', routerTable)
                .then(res => {
                    console.log(`Update Configuration complete: ${routerTable.uri}`)
                })
                .catch(error => console.error(error))
        });
        /*
        this.server = https.createServer({
            key: fs.readFileSync('ssl/server.key'),
            cert: fs.readFileSync('ssl/server.crt')
        }, app)
        .listen(443, function () {
            console.log((new Date()) + "Server now running on port", self.server.address());
            routerTable.uri = 'ws://' + self.server.address().address + self.server.address().port;
            jsonfile.writeFile('./config/rvproxy.json', routerTable)
                .then(res => {
                    console.log(`Update Configuration complete: ${routerTable.uri}`)
                })
                .catch(error => console.error(error))
        });
        */
    }

    startWsServer() {
        let self = this;

        this.wsServer = new WebSocketServer({
            httpServer: this.server,
            autoAcceptConnections: false
        });
                
        this.wsServer.on('request', function(request) {
            console.warn(`wsRequest: ${request.origin}[${request.requestedProtocols}]`);
            let connection = self.evRequest(request,self);
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
        console.log(`Add App Server path: ${cli}`);
        
        shell.exec(cli,//`${proc} ${path} ${uri}`, 
          function(code, stdout, stderr) {
            console.log('Exit code:', code);
            console.log('Program output:', stdout);
            console.log('Program stderr:', stderr);
          });
          
        res.status(200).send({status: 'ok'})
    }

    getAddressServer(req,res) {
        const uri = 'ws://' + this.server.address().address + this.server.address().port;
        res.status(200).send({uri: uri})
    }

    getMicroServicesMap(req,res) {
        const microServices = Object.keys(keyMsConnections);
        console.log(`Get Microservices Map: ${JSON.stringify(microServices)}`);
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

        if (this.msgSend(target,
                        (type === 'utf8') ? {type: type, utf8Data: data} : 
                                            {type: type, binaryData: data})) {
            res.status(200).send({status: 'OK'});
        } else {
            res.status(404).send({status: 'Not Found'});
        }
    }

    msgSend(target,message) {  
        if (keyMsConnections[target]) {
            if (message.type === 'utf8') {
                keyMsConnections[target].sendUTF(message.utf8Data);
                console.info(`- rproxyServer send utf8 msg ${target}: - ${message.utf8Data}`);
                return true;                
            } else if (type === 'binary') {
                keyMsConnections[target].sendBytes(message.binaryData);
                console.info(`- rproxyServer send binary msg ${target}: - ${message.binaryData}`);
                return true;
            }
            console.error(`- rproxyServer Wrong Message type: ${message.type}`);
            return false;
        } else {
            console.info(`- rproxyServer target ${target} not connected`);
            return false;
        }
    }

    /**
     * Implementation required
     */
    evMessage(message,connection) {
        throw new Error('You have to implement the method doSomething!');
    //    console.log(`recv Msg from: ${connection.origin}`);
    //    this.msgSend(connection.origin,message);
    }

    evRequest(request,parent) {
        throw new Error('You have to implement the method doSomething!');
    }
}

module.exports.rproxyServer = rproxyServer;