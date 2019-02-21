'use strict';

const WebSocketClient = require('websocket').client;
const daFsm = require('dafsm').asyncDafsm;

class rproxyClient extends daFsm {
    constructor(uri,asname,protocol) {
        super(asname);
        let self = this;
        this.uri = uri;
        this.asname = asname;
        this.protocol = protocol;
        this.client = new WebSocketClient();

        this.client.on('connectFailed', function(error) {
            console.error(`${this.asname} connect to ${this.uri} Error: ${error.toString()}`);
        });
         
        this.client.on('connect', function(connection) {
            self.connection = connection;
            console.info(`${self.asname} Client Connected to ${self.uri}`);
            connection.on('error', function(error) {
                console.error(`${self.asname} Connection Error: " + ${error.toString()}`);
            });
            connection.on('close', function() {
                self.connection = null;
                console.info(`${self.asname}[${self.protocol}] Connection Closed`);
            });
            connection.on('message', function(message) {
                self.evMessage(message,this);  
            });
        });
//        console.log(`wsClient ${asname}[${uri}] try to connect to Reverse Proxy Server`);
//        this.client.connect(uri,protocol,asname);
    }

    connect(uri) {
        const URI = uri || this.uri;
        console.log(`wsClient ${this.asname}[${URI}] try to connect to Reverse Proxy Server`);
        this.client.connect(URI,this.protocol,this.asname);        
    }

    msgSend(message) {
        if (this.connection && this.connection.connected) {
            if (message.type === 'utf8') {
                this.connection.sendUTF(message.utf8Data);
            } else if (type === 'binary') {
                this.connection.sendBytes(message.binaryData);
            }
            return true;
        } else {
            return false;
        }
    }

    /**
     * Implementation required
     */
    evMessage(message,connection) {
        throw new Error('You have to implement the method doSomething!');
    }
}

module.exports.rproxyClient = rproxyClient;