'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const uniqid = require('uniqid');
const shell = require('shelljs');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const rvsProxy =  require('../lib/rproxyServer').rproxyServer;

let roomConnection = {};

class reverseProxy extends rvsProxy {

    constructor(app,port) {
        super(app,port);
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
                console.log((new Date()) + ` wsServer Connection accepted client: ${userid} to room: ${roomid}`);
                parent.msgSend('wboard',{
                    type: 'utf8',
                    utf8Data: JSON.stringify({
                        msg: 'init',
                        room: roomid
                    })
                });
            } else {
                console.error(`Wrong allocation ${service}, ${roomid}`);
            }
        } else {
            let channel = request.requestedProtocols;
            let service = request.origin;
            connection = request.accept(channel[0],service);
            connection.origin = { channel: channel, service: service };
            super.setServiceConnection(channel,service,connection);
            console.log((new Date()) + ` wsServer Connection accepted microservice: ${service}`);
        }
        
        connection.on('message', function(message) {
            try {
                var command = JSON.parse(message.utf8Data);
                switch(command.head.target) {
                    case 'rproxy':
                        console.log(`RProxy recv: ${message.utf8Data}`); 
                    break;
                    case 'route':
                        console.log(`Publish to channel: ${connection.origin.channel}`); 
                        parent.routeMessage(connection.origin,message); 
                    break;
                    case 'client':
                        console.log(`Response to client room: ${command.head.roomKey}`);
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
                        console.log(`Redirect to target: ${command.head.target}`);    
                }
            }
            catch(e) {
                console.log(`Return Error Message`);
            }
        });
        
        connection.on('close', function(reasonCode, description) {
            parent.delServiceConnection(connection.origin.channel,connection.origin.service);
            console.log((new Date()) + ` Peer ${connection.origin} disconnected.`);
        });        

        connection.sendUTF("Welcome");
        return connection;
    }

    runChildMS(ms) {
        const cli = `${ms.proc} ${ms.path} --uri=${ms.uri}`;
        console.log(`Add Micro Service path: ${cli}`); 
        shell.exec(cli,
          function(code, stdout, stderr) {
            console.log('Exit code:', code);
            console.log('Program output:', stdout);
            console.log('Program stderr:', stderr);
        });        
    }

    evMessage(message,connection) {
        
        if (message.type === 'utf8') {
            console.log(`recv Msg from: ${connection.userid} -> ${JSON.stringify(message.utf8Data)}`);
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
            }

            //super.msgSend(message.utf8Data.target,message);
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
        /*
        rproxy.msgSend('wboard',{
            type: 'utf8',
            utf8Data: JSON.stringify({
                msg: 'init',
                room: req.params.room
            })
        })
        */
    })

const config =  require('../config/default.json');
const jsonfile = require('jsonfile');
const https = require('https');
const fs = require('fs')

const PORT = process.env.PORT || 5000;    
const rproxy = new reverseProxy();

let server = app.listen(PORT, function () {    
    console.log((new Date()) + "Server now running on port", server.address());
    rproxy.startWsServer(server);

    for (const [key, value] of Object.entries(config.router["services"])) {
        console.info(`Start ${key}`);
        rproxy.runChildMS({proc:value.config.proc,path:value.config.script,uri:config.router.uri});
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
