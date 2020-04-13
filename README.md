# Segbird

## Introduction

This is a prototype for abstracting http messages between microservices
into simple events using a publish-subscribe scheme.

## Requirements
* Loopback 2.x or 3.x. Ideally, it would be
great to have only Express as a dependency.

## Main Features
* Endpoints standardization.
* Automatic authentication using JWT.
* Abstraction layer using a publish-subscribe scheme.

## Usage

For this example, we will have two microservices:
* Microservice A: http://microservice-a.com
* Microservice B: http://microservice-b.com

Objective: Microservice A needs to send a message to Microservice B.

### Microservice A (publication):

Create a boot script called "segbird.js". Require and initialize Segbird. 

*/server/boot/segbird.js*
```javascript
const segbird = require('segbird');
module.exports = (server) => {
  segbird.init({
    server, // The Loopback server instance
    services: { // A list of microservices that will be used as a target to publish messages
      B: 'http://microservice-b.com',
    },
    jwtSecret: 'mySuperSecretKey', // A secret key the will be used to sign JWT requests
  });
};
```

Wherever you want, publish a message to Microservice B.

*/server/models/user.js*
```javascript
const segbird = require('segbird');

module.exports = (User) => {
    const functionThatWillTriggerEvents = async () => {
        await segbird.publish('myCustomEvent', 'B', {name: 'John Doe'});
    };
};
```


### Microservice B (subscription):

In microservice B, create a boot script called "segbird.js". Require and initialize Segbird.
After this, subscribe to the event that Microservice A will publish.

*/server/boot/segbird.js*
```javascript
const segbird = require('segbird');
module.exports = (server) => {
    segbird.init({
        server, // The Loopback server instance
        jwtSecret: 'mySuperSecretKey', // The same JWT secret you used to initialize Segbird in Microservice A. It will be used to verify incoming requests.
    });
    segbird.subscribe('myCustomEvent', async (data) => {
        console.log(data) // {name: 'John Doe'}
    });
};
```

```Note: You must initialize Segbird with the same JWT secret that you used in microservice A.```


