'use strict';

const WebSocketClient = require('websocket').client;
const daFsm = require('dafsm').asyncDafsm;

class rproxyClient extends daFsm {
    constructor(uri,protocol,asname) {
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
    }

    connect(uri) {
        const URI = uri || this.uri;
        console.log(`wsClient ${this.asname}[${URI}] try to connect to Reverse Proxy Server`);
        this.client.connect(URI,this.protocol,this.asname);        
    }

    msgSend(message) {
        if (this.connection && this.connection.connected) {
            console.log(`${this.asname} Sending ${JSON.stringify(message)} to channel: ${this.protocol}`);
            if (message.type === 'utf8') {
                this.connection.sendUTF(message.utf8Data);
                return true;
            } else if (type === 'binary') {
                this.connection.sendBytes(message.binaryData);
                return true;
            } else {
                console.log(`${this.asname} Wrong Message type: ${message.type}`);
                return false;
            }
        } else {
            console.log(`${this.asname} Connection is not connected`);
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