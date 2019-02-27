'use strict';

const msClient =  require('../lib/rproxyClient').rproxyClient;
const request = require('request');
const opts = require('optimist').argv;

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
                    console.log(`wboard: command msg ${command.msg}`);
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
                            connection.sendUTF(JSON.stringify({
                                    head: {
                                        target  : 'client',
                                        origin  : 'wboard',
                                        roomKey : command.head.roomKey
                                    },
                                    msg : command.msg
                                }));
                        break;
                        case  'drawLine':
                            roomConnection[command.head.roomKey].canvasCommands.push(command);
                            connection.sendUTF(JSON.stringify({
                                    head: {
                                        target  : 'client',
                                        origin  : 'wboard',                                   
                                        roomKey : command.head.roomKey
                                    },
                                    msg : command.msg,
                                    data: command.data
                                }));
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

console.log(`PARAM: ${opts.uri}`); 

setTimeout(()=>{

    request(opts.uri+'address', 
            function (error, response, body) {                                        
                if(error) {
                    console.log('error:', error); 
                    return;
                } else if(response.statusCode === 200) {
                    console.log('body:', body); 
                    const address = JSON.parse(body);
                    const rclient = new asWboard(address.uri,'whiteboard','wboard');
                    rclient.connect(address.uri);  
                    setInterval(()=>{},100);                 
                } else {
                    console.log('statusCode:', response && response.statusCode); 
                }
        });       
},1000)
