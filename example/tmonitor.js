'use strict';

const msClient = require('../index').rproxyClient;
const request = require('request');
const opts = require('optimist').argv;

const errorRoute = require('../lib/rproxyError').routerError;
const log4js = require('log4js');
const logger = log4js.getLogger('tmonitor:proxyClient');
logger.level = 'trace';

class asMonTraffic extends msClient {

    constructor(uri,protocol,asname,events) { 
        super(uri,protocol,asname,events);
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
                } else {
                    super.evMessage(message);
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
                    const rclient = new asMonTraffic(address.uri,opts.protocol,opts.name,
                        {
                            keepalive: (msg) => { return "Alilya" }
                        });
                    rclient.connect(address.uri);  

                    setTimeout(()=>{
                    /* Send Test Redirect Message*/
                        rclient.request({ 
                            head: {
                                target  : 'mbroker',
                                origin  : 'tmonitor',
                                request : 'keepalive'
                            },
                            body: "The Test TMonitor => MBroker"
                        })
                        .then(result => { logger.trace("FINITE:",result) })

                    },5000);

                    setInterval(()=>{},100);
                 
                } else {
                    logger.warn('statusCode:', response && response.statusCode); 
                }
        });       
},1000)
