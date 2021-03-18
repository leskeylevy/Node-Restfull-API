/**
 * Primary file for the api
 */

// Dependencies
var http = require('http');
var url = require('url');
var stringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');

// the server should respond to all requests with a string
var server = http.createServer(function(req,res){
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
    var choosenHandler = typeof(router[trimmedPath]) !=='undefined' ? router[trimmedPath] : handlers.notFound;

    // Construct the data object to sedn to the handler
    var data = {
        'trimmedPath': trimmedPath,
        'queryStringObject': queryStringObject,
        'method': method,
        'headers': headers,
        'payload': buffer
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
});

// start the server
server.listen(config.port,function(){
    console.log('The server is listening on port ' +config.port+ ' in ' +   config.envName+ ' mode')
});

// Defining handlers
var handlers = {};

// Sample handler
handlers.sample = function(data,callback){
    // Callback http status code, and a payload object
    callback(406,{'name': 'sample handler'});
}

// Not found handler
handlers.notFound = function(data,callback){
    callback(404);
}
// Defining a request router
var router = {
    'sample': handlers.sample
}
