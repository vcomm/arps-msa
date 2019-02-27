'use strict';

const msClient =  require('../lib/rproxyClient').rproxyClient;
const request = require('request');
const opts = require('optimist').argv;

class asMonTraffic extends msClient {

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
                        origin  : 'tmonitor',
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
                    const rclient = new asMonTraffic(address.uri,'trafficmon','tmonitor');
                    rclient.connect(address.uri);  

                    setTimeout(()=>{
                    /* Send Test Redirect Message*/
                        rclient.msgSend({
                            type:'utf8',
                            utf8Data:JSON.stringify({ 
                                head: {
                                target  : 'mbroker',
                                origin  : 'tmonitor',
                                command : 'message'
                                },
                                body: "The Test TMonitor => MBroker"
                            })})
                    },5000);

                    setInterval(()=>{},100);
                 
                } else {
                    console.log('statusCode:', response && response.statusCode); 
                }
        });       
},1000)
