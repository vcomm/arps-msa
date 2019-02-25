'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const uniqid = require('uniqid');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const rvsProxy =  require('../lib/rproxyServer').rproxyServer;
/*
let roomConnection = {};
*/
class reverseProxy extends rvsProxy {

    constructor(app,port) {
        super(app,port);
        this.name = 'rproxy';
    }
    
    evRequest(request,parent) {

        /*
        let type    = request.requestedProtocols[0];
        let service = request.requestedProtocols[1];
        let userid  = request.requestedProtocols[2];
        let roomid  = request.requestedProtocols[3];
        
        if (roomConnection[service][roomid]) {
            let connection = request.accept(service, userid);
            connection.userid = userid;
            keyConnections[userid] = connection;
            roomConnection[service][roomid].connections.push(connection);

            console.log((new Date()) + ' wsServer Connection accepted.');

            connection.on('message', function(message) {
                parent.evMessage(message,this);
            });
            
            connection.on('close', function(reasonCode, description) {
                delete keyConnections[this.userid];
                console.log((new Date()) + ' Peer ' + this.userid + ' disconnected.');
            });
        } else {
            console.error(`Wrong allocation ${service}, ${roomid}`);
        }
        */
        //let self = this;
        let channel = request.requestedProtocols;
        let service = request.origin;
        let connection = request.accept(channel[0],service);
        connection.origin = { channel: channel, service: service };
        super.setServiceConnection(channel,service,connection);

        console.log((new Date()) + ' wsServer Connection accepted.');

        connection.on('message', function(message) {
            try {
                var command = JSON.parse(message.utf8Data);
                switch(command.head.target) {
                    case 'rproxy':
                        console.log(`RProxy recv: ${message.utf8Data}`); 
                    break;
                    case 'route':
                        parent.routeMessage(connection.origin,message); 
                    break;
                    default:
                        console.log(`Unsupported target: ${command.head.target}`);    
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
/*
    reqWc2Ms(command,data) {
        debugger;
        console.info(`Route WebClient request to MicroService: ${command.head.service}`);     
        //super.msgSend(command.head.service,{type: type, utf8Data: data});
        let msConnections = require('../lib/rproxyServer').msConnections;
        msConnections[command.head.service].sendUTF(data); 
    }

    resMs2Wc(command,data) {
        console.info(`Route responce to WebClient from MicroService: ${command.service}`);
        roomConnection[command.head.service][command.head.roomid].connections.sendUTF(data);    
    }
*/    
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
            service: 'whiteboard',
            type:    'webclient',
            userId:  uniqid(),
            roomKey: req.params.room
        });
/*
        if (!roomConnection['whiteboard']) {
            roomConnection['whiteboard'] = {}
        } 
        if (!roomConnection['whiteboard'][req.params.room]) {
            roomConnection['whiteboard'][req.params.room] = {
                connections: []
            }
        }
*/        
        rproxy.msgSend('whiteboard',{
            type: 'utf8',
            utf8Data: {
                msg: 'init',
                room: req.params.room
            }
        })
    })

const PORT = process.env.PORT || 5000;    
const rproxy = new reverseProxy(app,PORT);
rproxy.startWsServer();