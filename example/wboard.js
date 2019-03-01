'use strict';

const msClient =  require('../lib/rproxyClient').rproxyClient;
const request = require('request');
const opts = require('optimist').argv;

const errorRoute = require('../lib/rproxyError').routerError;
const log4js = require('log4js');
const logger = log4js.getLogger('wboard:proxyClient');
logger.level = 'trace';

let roomConnection = {};

class asWboard extends msClient {

    constructor(uri,protocol,asname) { 
        super(uri,protocol,asname);
    }
    
    evMessage(message,connection) {
        if (message.type === 'utf8') {
            logger.trace(`=> ${this.asname} Received Message: ${message.utf8Data}`);
            try {
                if (message.utf8Data === "Welcome") {
                    connection.sendUTF(JSON.stringify({ head: {
                        target  : 'rproxy',
                        origin  : 'wboard',
                        command : 'signin'
                    }}));
                } else {
                    let command = JSON.parse(message.utf8Data);
                    logger.trace(`wboard: command msg ${command.msg}`);
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
                logger.error(new errorRoute(`Received Error Message: ${e} `));
            }
        }      
    }
}

//console.log(`PARAM: ${opts.uri}`); 

setTimeout(()=>{

    request(opts.uri+'address', 
            function (error, response, body) {                                        
                if(error) {
                    logger.error('error:', error); 
                    return;
                } else if(response.statusCode === 200) {
                    logger.trace('body:', body); 
                    const address = JSON.parse(body);
                    const rclient = new asWboard(address.uri,'whiteboard','wboard');
                    rclient.connect(address.uri);  
                    setInterval(()=>{},100);                 
                } else {
                    logger.warn('statusCode:', response && response.statusCode); 
                }
        });       
},1000)
