/**
 * Worker-related task
 */

// Dependencies
var path = require('path');
var fs = require('fs');
var _data = require('./data');
var https = require('https');
var http = require('http');
var helpers = require('./helpers');
var url = require('url');
const { type } = require('os');



// Instantaite the worker object
var workers = {};

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = function(){
    // Get all the checks
    _data.list('checks',function(err,checks){
        if(!err && checks && checks.length > 0 ){
            checks.forEach(function(check){
                // Read the data in check
                _data.read('checks', check, function(err,originalCheckData){
                    if(!err && originalCheckData){
                        // Pass it to the check validator and let that function continue or log error as needed
                        workers.validateCheckData(originalCheckData);
                    }else{
                        console.log('Error reading one of the check\'s data');
                    }
                });
            })
        }else {
            console.log('Error: Could not find any checks to process');
        }
    })
};


// Sanity-check the check-data
workers.validateCheckData = function(originalCheckData){
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData: {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['put', 'get', 'post','delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;


    // Set the keys that may not be set (if the worker has not seen this check before)
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;


    // If all the checks pass, pass the data along to the next step
    if(
        originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds
    ) {
        workers.performCheck(originalCheckData);
    }else{
        console.log("Error: One of the checks is not properly formatted skipping ..");
    }
}


// Perform the check, send the originalCheck data and the outcome of the check protocol
workers.performCheck = function(originalCheckData){
    // prepare the initial check outcome
    var checkOutcome ={
        'error': false,
        'responseCode' : false
    };

    //Mark that the outcome has not been sent yet
    var outComeSent = false;

    // Parse the hostname and the path out of the original check data
    var parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url, true);
    var hostName = parsedUrl.hostname;
    var path = parsedUrl.path; // using path instead of 'pathname' because we want the query string
    
    // Construct the request
    var requestDetails = {
        'protocol' : originalCheckData.protocol+':',
        'hostname' : hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000
    };

    // instatiate the request object (http or https module)
    var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    var req = _moduleToUse.request(requestDetails, function(res){
        // Get the status of the sent request
        var status = res.statusCode;

        // update and the checkOutcome and pass the data along
        checkOutcome.responseCode = status;
        if(!outComeSent){
            workers.processCheckOutcome(originalCheckData,checkOutcome);
            outComeSent = true;
        } 
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', function(e){
        // update the checkOutcome and pass the data along
        checkOutcome = {
            'error': true,
            'value': e
        };
        if(!outComeSent){
            workers.processCheckOutcome(originalCheckData,checkOutcome);
            outComeSent = true;
        }
    });

    // Bind to the timeout event
    req.on('timeout', function(e){
        // update the checkOutcome and pass the data along
        checkOutcome = {
            'error': true,
            'value': 'timeout'
        };
        if(!outComeSent){
            workers.processCheckOutcome(originalCheckData,checkOutcome);
            outComeSent = true;
        }
    });


    // End the request
    req.end();

};

// process the checkOutcome and update, update the check data as needed, triggeran alert to the users
// special logic for accomodating a check that has never been tested before

workers.processCheckOutcome = function(originalCheckData,checkOutcome){
    // Decide if the check is up or down
    var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up': 'down';

    // Decide if an alert is warranted 
    var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // Update the check data
    var newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();

    // save the update
    _data.update('checks', newCheckData.id, newCheckData, function(err){
        if(!err){
            // send the new check data to the next phase of the process if needed
            if(alertWarranted){
                workers.alertUserToStatusChange(newCheckData);
            } else {
                console.log('Check outcome has not changed no alert needed');
            }
        } else {
            console.log('Error trying to save updates to  one of the checks');
        }
    })
}

// Alert user to a change in status of their check
workers.alertUserToStatusChange = function(newCheckData){
    var msg = 'Alert: Your check for '+newCheckData.method.toUpperCase()+' '+newCheckData.protocol+'://'+newCheckData.url+' is currently '+newCheckData.state;

    helpers.sendTwilioSms(newCheckData.userPhone,msg,function(err){
        if(!err){
            console.log('success: User was alerted to status change in their check via sms: ',msg);
        } else {
            console.log('Error: could not send sms alert who had state change in their check');
        }
    })
}



// Timer to execute the worker-process once per minute
workers.loop = function(){
    setInterval(function(){
        workers.gatherAllChecks();
    }, 1000 * 60)
}



// Init script
workers.init =function() {
    // EXecute all checks immeadiately
    workers.gatherAllChecks();
    
    
    // Call the loop so the check will execute later on
    workers.loop();
}


// Export the app
module.exports = workers;