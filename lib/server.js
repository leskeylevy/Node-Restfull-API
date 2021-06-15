/**
 * Server related tasks
 */

// Dependencies I used the ES5 Version since I am yet to creat a packge.json for the entire project
var http = require('http');
var https = require('https');
var url = require('url');
var stringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var handlers = require('./handlers'); 
var helpers = require('./helpers');
var path = require('path');


// Instatiate the server module object
var server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer(function(req,res){
    server.unifiedServer(req,res);    
});



// instantiate HTTPS server
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
}

server.httpsServer = https.createServer(server.httpsServerOptions,function(req,res){
    server.unifiedServer(req,res);    
});



// All the server logicfor both http and https server
server.unifiedServer = function(req,res){

    // Get the url and parse it
    var parsedUrl = url.parse(req.url,true);

    // Get path of url
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g, '');

    //  Get the queryString as an object
    var queryStringObject = parsedUrl.query;

    // Get the http method
    var method = req.method.toLowerCase();

    // Get the headers as an object
    var headers = req.headers;

    // Get the payload, if any
    var decoder = new stringDecoder('utf-8');
    var buffer = '';
    req.on('data',function(data){
        buffer += decoder.write(data);
    })
    req.on('end',function(){
    buffer += decoder.end();

    // Choose the handler this request sholud go to. If the request is not found use not foound handler
    var choosenHandler = typeof(server.router[trimmedPath]) !=='undefined' ? server.router[trimmedPath] : handlers.notFound;

    // Construct the data object to sedn to the handler
    var data = {
        'trimmedPath': trimmedPath,
        'queryStringObject': queryStringObject,
        'method': method,
        'headers': headers,
        'payload': helpers.parseJsonToObject(buffer),
    };

    // Route the request to the specified handler
    choosenHandler(data,function(statusCode,payload){
        // Use the status code called back by the handler, or default to 200
        statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

        // Usethe payload called back by the handler, or default to an empty object
        payload = typeof(payload) == 'object' ? payload : {};

        // Convert payload object to string
        var payloadString = JSON.stringify(payload);

        // Return the response
        res.setHeader('Content-Type','application/json');
        res.writeHead(statusCode);
        res.end(payloadString);

        // Log the request path
        console.log('Returning this response: ', statusCode,payloadString);
    });

    });

};


// Defining a request router
server.router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks
};

// Init script
server.init = function() {
    // start the server HTTP server
    server.httpServer.listen(config.httpPort,function(){
        console.log('The server is listening on port ' +config.httpPort)
    });

    // Start the https server
// Start the HTTPS server
    server.httpsServer.listen(config.port,function(){
        console.log('The server is listening on port ' +config.httpsPort)
    });
}


// Export the module
module.exports = server;