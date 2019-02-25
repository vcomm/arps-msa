'use strict';

const msClient =  require('../lib/rproxyClient').rproxyClient;
const express = require('express');
const app = express();

let roomConnection = {};

class asMBroker extends msClient {

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
                        origin  : 'mbroker',
                        command : 'signin'
                    }}));
                }
                //var command = JSON.parse(message.utf8Data);

            }
            catch(e) {
                // do nothing if there's an error.
                console.log(`Return Error Message: ${message.utf8Data} `);
                //connection.sendUTF(message.utf8Data);
            }
        }      
    }
}

const PORT = require('../config/default.json').rproxyrouter.port+2;
const config = require('../config/rvproxy.json');
const rclient = new asMBroker(config.uri,'mediactrl','mbroker');
const server = app.listen(PORT, function () {   
    rclient.connect(config.uri);  
    console.log((new Date()) + "Media Broker micro service now running on port", server.address().port);
    setTimeout(()=>{
        rclient.msgSend({
        type:'utf8',
        utf8Data:JSON.stringify({ 
          head: {
            target  : 'route',
            origin  : 'mbroker',
            command : 'message'
          },
          body: "The Test"
        })})
    },5000)
});