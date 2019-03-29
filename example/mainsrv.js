'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const uniqid = require('uniqid');
const shell = require('shelljs');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const rvsProxy = require('../index');
const errorRoute = require('../lib/rproxyError').routerError;
const log4js = require('log4js');
const logger = log4js.getLogger('mainsrv:proxyServer');
logger.level = 'trace';

let roomConnection = {};

class reverseProxy extends rvsProxy.rproxyServer {

    constructor(router) {
        super(router);
        this.name = 'rproxy';
    }
    
    evRequest(request,parent) {
        let connection = null;
        if (request.requestedProtocols[0] === 'webclient') {
            let type    = request.requestedProtocols[0];
            let service = request.requestedProtocols[1];
            let userid  = request.requestedProtocols[2];
            let roomid  = request.requestedProtocols[3];
            
            if (roomConnection[service][roomid]) {
                connection = request.accept(service, userid);
                connection.origin = { channel: service, client: userid };
                roomConnection[service][roomid].connections.push(connection);
                logger.trace(` wsServer Connection accepted client: ${userid} to room: ${roomid}`);
                parent.msgSend('wboard',{
                    type: 'utf8',
                    utf8Data: JSON.stringify({
                        msg: 'init',
                        room: roomid
                    })
                });
            } else {
                logger.error(new errorRoute(`Wrong allocation ${service}, ${roomid}`));
            }
        } else {
            let channel = request.requestedProtocols;
            let service = request.origin;
            connection = request.accept(channel[0],service);
            connection.origin = { channel: channel, service: service };
            super.setServiceConnection(channel,service,connection);
            logger.trace(` wsServer Connection accepted microservice: ${service}`);
        }
        
        connection.on('message', function(message) {
            try {
                var command = JSON.parse(message.utf8Data);
                switch(command.head.target) {
                    case 'rproxy':
                        logger.trace(`MainSrv recv: ${message.utf8Data}`); 
                    break;
                    case 'route':
                        logger.trace(`Publish to channel: ${connection.origin.channel}`); 
                        parent.routeMessage(connection.origin,message); 
                    break;
                    case 'client':
                        logger.trace(`Response to client room: ${command.head.roomKey}`);
                        // rebroadcast command to all clients
                        roomConnection[command.head.origin][command.head.roomKey].connections.forEach(function(destination) {
                            destination.sendUTF(message.utf8Data);
                            if (message.type === 'utf8') {
                                destination.sendUTF(message.utf8Data);   
                            } else if (type === 'binary') {
                                destination.sendBytes(message.binaryData);
                            }                            
                        });                        
                    break;
                    default: 
                        parent.msgSend(command.head.target,message);
                        logger.trace(`Redirect to target: ${command.head.target}`);    
                }
            }
            catch(e) {
                logger.error(new errorRoute(`Received Error Message: ${e}`));
            }
        });
        
        connection.on('close', function(reasonCode, description) {
            if (connection.origin.service)
                parent.delServiceConnection(connection.origin.channel,connection.origin.service);
            logger.trace(` Peer ${JSON.stringify(connection.origin)} disconnected.`);
        });        

        connection.sendUTF("Welcome");
        return connection;
    }

    runChildMS(ms) {
        const cli = `${ms.proc} ${ms.path} --uri=${ms.uri}`;
        logger.trace(`Add Micro Service path: ${cli}`); 
        shell.exec(cli,
          function(code, stdout, stderr) {
            logger.error('Exit code:', code);
            logger.trace('Program output:', stdout);
            logger.warn('Program stderr:', stderr);
        });        
    }

    evMessage(message,connection) {
        
        if (message.type === 'utf8') {
            logger.trace(`recv Msg from: ${connection.userid} -> ${JSON.stringify(message.utf8Data)}`);
            try {
                var command = JSON.parse(message.utf8Data);
                /* 
                MicroService to WebClient
                head: {
                    service : 'whiteboard',
                    type    : 'microservice',
                    userId  : 'wboard',
                    roomKey : '...'
                }
                WebClient to MicroService
                head: {
                    service : 'whiteboard',
                    type    : 'webclient',
                    userId  : '...',
                    roomKey : '...'
                }                
                
                switch(command.head.type) {
                    case 'microservice':
                        this.resMs2Wc(command,message.utf8Data); 
                    break;
                    case 'webclient':
                        this.reqWc2Ms(command,message.utf8Data);
                    break;
                    default:
                    console.error(`Command type not support: ${command.head.type}`);
                }
                */
            } catch(e) {
                // do nothing if there's an error.
                logger.error(new errorRoute(`Received Error Message: ${e}`));
            }
        }
    }   
}

app
    .use(express.static(__dirname+'/public'))
    .use('/scripts', express.static(`${__dirname}/node_modules/`)) 
    .set('views', path.join(__dirname, 'public'))
    .set('view engine', 'ejs')
    .get('/address',(req,res) => rproxy.getAddressServer(req,res))
    .get('/msmap',(req,res) => rproxy.getMicroServicesMap(req,res))
    .post('/runas',(req,res) => rproxy.addMicroService(req,res))
    .post('/sendmsg',(req,res) => rproxy.sendMessage(req,res))
    .get('/wboard/:room', function(req, res) {
        res.render('wboard/index.ejs', {
            service: 'wboard',
            type:    'webclient',
            userId:  uniqid(),
            roomKey: req.params.room
        });

        if (!roomConnection['wboard']) {
            roomConnection['wboard'] = {}
        } 
        if (!roomConnection['wboard'][req.params.room]) {
            roomConnection['wboard'][req.params.room] = {
                connections: []
            }
        }
    })

const config =  require('../config/default.json');
/*
const jsonfile = require('jsonfile');
const https = require('https');
const fs = require('fs')
*/
const PORT = process.env.PORT || 5000;    
const rproxy = new reverseProxy(config.router);

let server = app.listen(PORT, function () {    
    logger.trace("Server now running on port", server.address());
    rproxy.startWsServer(server);

    for (const [key, value] of Object.entries(config.router["services"])) {
        logger.trace(`Start microservice: ${key}`);
        rproxy.runMicroService(value,config.router.uri);
        //rproxy.runChildMS({proc:value.config.proc,path:value.config.script,uri:config.router.uri});
    }
/*    
    routerTable.uri = 'ws://' + server.address().address + server.address().port;
    jsonfile.writeFile('./config/rvproxy.json', routerTable)
        .then(res => {
            console.log(`Update Configuration complete: ${routerTable.uri}`)
        })
        .catch(error => console.error(error))
*/        
});
/*
let server = https.createServer({
    key: fs.readFileSync('ssl/server.key'),
    cert: fs.readFileSync('ssl/server.crt')
}, app)
.listen(443, function () {
    console.log((new Date()) + "Server now running on port", server.address());
    rproxy.startWsServer(server);
    routerTable.uri = 'ws://' + server.address().address + server.address().port;
    jsonfile.writeFile('./config/rvproxy.json', routerTable)
        .then(res => {
            console.log(`Update Configuration complete: ${routerTable.uri}`)
        })
        .catch(error => console.error(error))
});
*/
