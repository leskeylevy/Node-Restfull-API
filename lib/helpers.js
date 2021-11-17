/*
 * Helpers for various tasks
 *
 */

// Dependencies
var config = require('./config');
var crypto = require('crypto');
var https = require('https');
var querystring = require('querystring');
var path = require('path');
var fs = require('fs')

// Container for all the helpers
var helpers = {};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function(str){
  try{
    var obj = JSON.parse(str);
    return obj;
  } catch(e){
    return {};
  }
};

// Create a SHA256 hash
helpers.hash = function(str){
  if(typeof(str) == 'string' && str.length > 0){
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};
// Create a string of random alpha numeric characters of certain length
helpers.createRandomString =  function(strLength){
  strLength = typeof(strLength)  == 'number' && strLength > 0? strLength : false;
  if(strLength){
    // Define all the possible characters that could go into a string                                                 
    var possibleChars = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start the final string
    var str = '';
    for(i = 1; i <= strLength; i++){
      // Get a random charcater 
      var randomCharacter = possibleChars.charAt(Math.floor(Math.random() * possibleChars.length)); 
      //  append to str
      str+=randomCharacter;
    }

    // Return the final string
    return str;
  } else {
    return false;
  }
};

// Send sms via twilio
helpers.sendTwilioSms = function(phone,msg,callback){
  // Validate the parameters
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
  msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
  if(phone && msg){
    // Configure the request payload
    var payload = {
      'From': config.twilio.fromPhone,
      'To': '+254'+phone,
      'Body': msg
    };

    // Stringfy the payload
    var stringPayload = querystring.stringify(payload);

    // Configure the request dets
    var requestDetails = {
      'protocol': 'https:',
      'hostname': 'api.twilio.com',
      'method': 'POST',
      'path': '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
      'auth': config.twilio.accountSid+':'+config.twilio.authToken,
      'headers': {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };


    // Instatiate the request object
    var req = https.request(requestDetails,function(res){
      // grao the status of the received request
      var status = res.statusCode;
      // callback successfully if the reqiest is successfull
      if(status == 200 || 201){
        callback(false)
      } else {
        callback('Status code returned was '+status)
      }
    });

    // Bind to the error event so that it doesn't get thrown
    req.on('error', function(e){
      callback(e)
    });

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();


  } else {
    callback('Given parameters are missing')
  }
}


// Get the string content of a template
helpers.getTemplate = function(templateName,data,callback){
  templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName: false;
  data = typeof(data) == 'object' && data !== null ? data: {};
  
  if(templateName){
    var templateDir = path.join(__dirname, './../templates/');
    fs.readFile(templateDir+templateName+'.html','utf8',function(err,str){
      if(!err && str && str.length > 0){
        // do he interpolation on the string
        var finalString = helpers.interpolate(str,data);
        callback(false,finalString);
      } else {
        callback('Template could not be found');
      }
    })
  }else {
    callback('A valid template name was not specified')
  }
} 

// Add the universal header and footer to a string, and pass provided data object to the header and footer for interpolation
helpers.addUniversalTemplates = function(str,data,callback){
  str = typeof(str) == 'string' && str.length > 0 ? str: '';
  data = typeof(data) == 'object' && data !== null ? data: {};

  // Get the header
  helpers.getTemplate('_header', data,function(err,headerString){
    if(!err && headerString){
      // Get the footer
      helpers.getTemplate('_footer', data,function(err,footerString){
        if(!err && footerString){
          // Addd them together
          var fullString = headerString+str+footerString;
          callback(false,fullString);
        } else {
          callback('Could not find the Footer template')
        }
      })
    } else {
      callback('Could not find the header template')
    }
  })
}


// take a given string and data object and find/replace all the keys in it
helpers.interpolate = function(str,data){
  str = typeof(str) == 'string' && str.length > 0 ? str: '';
  data = typeof(data) == 'object' && data !== null ? data: {};

  // Add templateGlobal Variables to the data object, prepending their key name with global
  for(var keyName in config.templateGlobals){
    if(config.templateGlobals.hasOwnProperty(keyName)){
      data['global.'+keyName] = config.templateGlobals[keyName]
    }
  }

  // For each key in data, insert value into the string and corresponding placeholder
  for(var key in data){
    if(data.hasOwnProperty(key) && typeof(data[key]) == 'string'){
      var replace = data[key];
      var find = '{'+key+'}';
      str = str.replace(find,replace);
    }
  }
  return str;
}





// Export the module
module.exports = helpers;