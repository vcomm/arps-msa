'use strict';

const msClient = require('../index').rproxyClient;
const request = require('request');
const opts = require('optimist').argv;

const errorRoute = require('../lib/rproxyError').routerError;
const log4js = require('log4js');
const logger = log4js.getLogger('tmonitor:proxyClient');
logger.level = 'trace';

class asMonTraffic extends msClient {

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
                        origin  : 'tmonitor',
                        command : 'signin'
                    }}));
                }
                //var command = JSON.parse(message.utf8Data);

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
                    const rclient = new asMonTraffic(address.uri,opts.protocol,opts.name);
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
                    logger.warn('statusCode:', response && response.statusCode); 
                }
        });       
},1000)
