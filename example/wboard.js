'use strict';

const msClient =  require('../lib/rproxyClient').rproxyClient;
const express = require('express');
const app = express();

let roomConnection = {};

class asWboard extends msClient {

    constructor(uri,protocol,asname) { 
        super(uri,protocol,asname);
    }
    
    evMessage(message,connection) {
        if (message.type === 'utf8') {
            console.log(`=> ${this.asname} Received Message: ${message.utf8Data}`);
            try {
                if (message.utf8Data === "Welcome") {
                    connection.sendUTF(JSON.stringify({ head: {
                        target  : 'rproxy',
                        origin  : 'wboard',
                        command : 'signin'
                    }}));
                } else {
                    let command = JSON.parse(message.utf8Data);
                    switch(command.msg) {
                        case 'init':
                            if (!roomConnection[command.room]) {
                                roomConnection[command.room] = {
                                    canvasCommands: []      
                                }
                            }
                        break;
                        case 'clear':
                            roomConnection[command.head.roomKey].canvasCommands = [];
                            connection.sendUTF({
                                type: type, 
                                utf8Data: JSON.stringify({
                                    head: {
                                        service : 'whiteboard',
                                        type    : 'microservice',
                                        userId  : 'whiteboard',
                                        roomKey : command.head.roomKey
                                    },
                                    msg : command.msg,
                                    data: command.data
                                })
                            });
                        break;
                        case  'drawLine':
                            roomConnection[command.head.roomKey].canvasCommands.push(command);
                            connection.sendUTF({
                                type: type, 
                                utf8Data: JSON.stringify({
                                    head: {
                                        service : 'whiteboard',
                                        type    : 'microservice',
                                        userId  : 'whiteboard',                                    
                                        roomKey : command.head.roomKey
                                    },
                                    msg : command.msg,
                                    data: command.data
                                })
                            });
                        break; 
                    }
                }
            }
            catch(e) {
                // do nothing if there's an error.
                console.log(`Return Error Message`);
                //connection.sendUTF(message.utf8Data);
            }
        }      
    }
}

const PORT = require('../config/default.json').rproxyrouter.port+1;
const config = require('../config/rvproxy.json');
const rclient = new asWboard(config.uri,'whiteboard','wboard');
const server = app.listen(PORT, function () {   
    rclient.connect(config.uri);  
    console.log((new Date()) + "Whiteboard micro service now running on port", server.address().port);
});
