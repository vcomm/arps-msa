# Reverse Proxy Server
Adaptive Reverse Proxy Server for build Micro Services architecture supporting WebSockets

![rps](https://user-images.githubusercontent.com/40527636/53623670-701e1200-3c06-11e9-8cba-fec52f483bfd.jpg)

## Demo app Whiteboard based on WebSocket routing: 
https://vcomm.herokuapp.com/wboard/test

## Introduction
A reverse proxy server is a type of proxy server that typically sits behind the firewall in a private network and directs client requests to the appropriate backend server. A reverse proxy provides an additional level of abstraction and control to ensure the smooth flow of network traffic between clients and servers.

### Common uses for a reverse proxy server include:

- Load balancing – A reverse proxy server can act as a “traffic cop,” sitting in front of your backend servers and distributing client requests across a group of servers in a manner that maximizes speed and capacity utilization while ensuring no one server is overloaded, which can degrade performance. If a server goes down, the load balancer redirects traffic to the remaining online servers.
- Web acceleration – Reverse proxies can compress inbound and outbound data, as well as cache commonly requested content, both of which speed up the flow of traffic between clients and servers. They can also perform additional tasks such as SSL encryption to take load off of your web servers, thereby boosting their performance.
- Security and anonymity – By intercepting requests headed for your backend servers, a reverse proxy server protects their identities and acts as an additional defense against security attacks. It also ensures that multiple servers can be accessed from a single record locator or URL regardless of the structure of your local area network.
- Microservices adoption - Easy decomposing  monolithic applications architecture hell to microservice architecture for easy testability and deployability.

# Installation

npm install rps 
     OR
insert in package.json:

  "dependencies": {
    "rps": "git+https://github.com/vcomm/rps.git",
    ......
  }

# Example usage
## User's Reverse Proxy Server

please see code: example/mainsrv.js

## User's Microservice Worker

please see code: example/mbroker.js, example/wboard.js

## User's runtime cluster scale orchestration management
TBD
## Reverse Proxy Server Configuration
please see JSON structure in config/default.json

### Startup reverse proxy server

    "router" : {

        "uri"   : "<your public URI>",    
        "server": "example/mainsrv.js", 
        .....
    }
### Startup microservices workers

    "router" : {
        .....
        "services": {
            "mediabroker" : {
                "name"  : "mbroker",
                "config": {
                    "proc"       : "node",
                    "script"     : "example/mbroker.js",
                    "instances"  : 2,
                    "exec_mode"  : "cluster"
                }
            }, 
            "trafficmon" : {
                "name"  : "tmonitor",
                "config": {
                    "proc"       : "node",
                    "script"     : "example/tmonitor.js",
                    "instances"  : 1,
                    "exec_mode"  : "cluster"
                }
            }, 
            "whiteboard" : {
                "name"  : "wboard",
                "config": {
                    "proc"       : "node",
                    "script"     : "example/wboard.js",
                    "instances"  : 2,
                    "exec_mode"  : "cluster"
                }
            }
        },
        .....
    }

### Define internal microservices channels & config publishers/subscribers

    "router" : {
        .....
        
        "channels" : {
            "mediactrl": {
                "publishers": {
                    "mbroker": {
                        "type": "service",
                        "connection": null
                    },
                    "any": {
                        "pswd": "TBD",
                        "type": "client",
                        "connections": {}                        
                    }
                },
                "subscribers": {
                    "mbroker": {
                        "type": "service",
                        "connection": null
                    },
                    "any": {
                        "pswd": "TBD",
                        "type": "client",
                        "connections": {}                         
                    }
                }
            },
            "trafficmon": {
                "publishers": {
                    "mbroker": {
                        "type": "service",
                        "connection": null
                    },
                    "tmonitor": {
                        "type": "service",
                        "connection": null                        
                    }
                },
                "subscribers": {
                    "mbroker": {
                        "type": "service",
                        "connection": null
                    },
                    "tmonitor": {
                        "type": "service",
                        "connection": null                        
                    }
                }                
            },
            "whiteboard": {
                "publishers": {
                    "wboard": {
                        "type": "service",
                        "connection": null
                    },
                    "any": {
                        "pswd": "TBD",
                        "type": "client",
                        "connections": {}                      
                    }
                },
                "subscribers": {
                    "wboard": {
                        "type": "service",
                        "connection": null
                    },
                    "any": {
                        "pswd": "TBD",
                        "type": "client",
                        "connections": {}                        
                    }
                }
            }
        }

        .....
    }        
