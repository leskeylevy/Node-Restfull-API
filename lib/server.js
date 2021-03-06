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
var util = require('util');
var debug = util.debuglog('server');


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

    // if the request is within the public directory use the publuic handler instead
    choosenHandler = trimmedPath.indexOf('public/') >-1 ? handlers.public : choosenHandler;

    // Construct the data object to sedn to the handler
    var data = {
        'trimmedPath': trimmedPath,
        'queryStringObject': queryStringObject,
        'method': method,
        'headers': headers,
        'payload': helpers.parseJsonToObject(buffer),
    };

    // Route the request to the specified handler
    choosenHandler(data,function(statusCode,payload,contentType){

        // Determine the response (fallback to json)
        contentType = typeof(contentType) == 'string' ? contentType: 'json';

        // Use the status code called back by the handler, or default to 200
        statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
        

        // Return the response parts that are content specific
        var payloadString = '';

        if (contentType == 'json'){
            res.setHeader('Content-Type','application/json');
            payload = typeof(payload) == 'object' ? payload : {};
            payloadString = JSON.stringify(payload);
            
        }

        if(contentType == 'html'){
            res.setHeader('Content-Type', 'text/html');
            payloadString = typeof(payload) == 'string' ? payload: '';
        }
        if(contentType == 'favicon'){
            res.setHeader('Content-Type', 'image/x-icon');
            payloadString = typeof(payload) !== 'undefined' ? payload: '';
        }
        if(contentType == 'css'){
            res.setHeader('Content-Type', 'text/css');
            payloadString = typeof(payload) !== 'undefined' ? payload: '';
        }
        if(contentType == 'png'){
            res.setHeader('Content-Type', 'image/png');
            payloadString = typeof(payload) !== 'undefined' ? payload: '';
        }
        if(contentType == 'jpg'){
            res.setHeader('Content-Type', 'image/jpeg');
            payloadString = typeof(payload) !== 'undefined' ? payload: '';
        }
        if(contentType == 'plain'){
            res.setHeader('Content-Type', 'text/plain');
            payloadString = typeof(payload) !== 'undefined' ? payload: '';
        }
        // Return the response-parts that are common to all content-types
        res.writeHead(statusCode);
        res.end(payloadString);

        // Log the request path
        // If the response is 200 print green otherwise print red
        if(statusCode == 200){
            debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
        }else {
            debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
        }
        debug('Returning this response: ', statusCode,payloadString);
    });

    });

};


// Defining a request router
server.router = {
    '': handlers.index,
    'account/create': handlers.accountCreate,
    'account/edit': handlers.accountEdit,
    'account/deleted': handlers.accountDeleted,
    'session/create': handlers.sessionCreate,
    'session/deleted': handlers.sessionDeleted,
    'checks/all': handlers.checkList,
    'checks/create': handlers.checksCreate,
    'checks/edit': handlers.checksEdit,
    'ping': handlers.ping,
    'api/users': handlers.users,
    'api/tokens': handlers.tokens,
    'api/checks': handlers.checks,
    'favicon.ico': handlers.favicon,
    'public': handlers.public
};

// Init script
server.init = function() {
    // start the server HTTP server
    server.httpServer.listen(config.httpPort,function(){
        console.log('\x1b[35m%s\x1b[0m', 'The server is listening on port ' +config.httpPort);

    });

    // Start the https server
// Start the HTTPS server
    server.httpsServer.listen(config.port,function(){
        console.log('\x1b[36m%s\x1b[0m', 'The server is listening on port ' +config.httpPort);
    });
}


// Export the module
module.exports = server;