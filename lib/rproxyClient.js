'use strict';

const WebSocketClient = require('websocket').client;
const rproxyMessage = require('./rproxyMessage');
const errorRoute = require('./rproxyError').routerError;
const log4js = require('log4js');
const logger = log4js.getLogger('proxyClient');
logger.level = 'trace';

class rproxyClient extends rproxyMessage {
    constructor(uri,protocol,asname,events) {
        super(asname,events);
        this.uri = uri;
        this.asname = asname;
        this.protocol = protocol;
        this.client = new WebSocketClient();
        this.connection = null;

        let self = this;

        this.client.on('connectFailed', function(error) {
            throw logger.error(new errorRoute(`wsServer request connection reject: ${error.toString()}`));
        });
         
        this.client.on('connect', function(connection) {
            self.connection = connection;
            logger.trace(`${self.asname} Client Connected to ${self.uri}`);
            connection.on('error', function(error) {
                logger.error(new errorRoute(`${self.asname} Connection Error: " + ${error.toString()}`));
            });
            connection.on('close', function() {
                self.connection = null;
                logger.trace(`${self.asname}[${self.protocol}] Connection Closed`);
            });
            connection.on('message', function(message) {
                self.evMessage(message,this);  
            });
        });
    }

    connect(uri) {
        const URI = uri || this.uri;
        logger.trace(`wsClient ${this.asname}[${URI}] try to connect to Reverse Proxy Server`);
        this.client.connect(URI,this.protocol,this.asname);        
    }

    msgSend(message) {
        if (this.connection && this.connection.connected) {
            logger.trace(`${this.asname} Sending ${JSON.stringify(message)} to channel: ${this.protocol}`);
            if (message.type === 'utf8') {
                this.connection.sendUTF(message.utf8Data);
                return true;
            } else if (type === 'binary') {
                this.connection.sendBytes(message.binaryData);
                return true;
            } else {
                logger.warn(`${this.asname} Wrong Message type: ${message.type}`);
                return false;
            }
        } else {
            logger.warn(`${this.asname} Connection is not connected`);
            return false;
        }
    }

    evMessage(message,connection) {
        return super.response(message);
    }
}

//module.exports.rproxyClient = rproxyClient;
module.exports = rproxyClient;