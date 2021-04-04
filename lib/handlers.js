/*
 * Request Handlers
 *
 */

// Dependencies
var config = require('./config');
var _data = require('./data');
var helpers = require('./helpers');

// Define all the handlers
var handlers = {};

// Ping
handlers.ping = function (data, callback) {
  callback(200);
};

// Not-Found
handlers.notFound = function (data, callback) {
  callback(404);
};

// Users
handlers.users = function (data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the users submethods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function (data, callback) {
  // console.log(data);
  // Check that all required fields are filled out
  var firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  var tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure the user doesnt already exist
    _data.read('users', phone, function (err, data) {
      if (err) {
        // Hash the password
        var hashedPassword = helpers.hash(password);

        // Create the user object
        if (hashedPassword) {
          var userObject = {
            'firstName': firstName,
            'lastName': lastName,
            'phone': phone,
            'hashedPassword': hashedPassword,
            'tosAgreement': true
          };

          // Store the user
          _data.create('users', phone, userObject, function (err) {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, {
                'Error': 'Could not create the new user'
              });
            }
          });
        } else {
          callback(500, {
            'Error': 'Could not hash the user\'s password.'
          });
        }

      } else {
        // User alread exists
        callback(400, {
          'Error': 'A user with that phone number already exists'
        });
      }
    });

  } else {
    callback(400, {
      'Error': 'Missing required fields'
    });
  }

};

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = function (data, callback) {
  // Check that phone number is valid
  var phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if (phone) {

    // Get the token from the headers
    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
    // verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user
        _data.read('users', phone, function (err, data) {
          if (!err && data) {
            // Remove the hashed password from the user user object before returning it to the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {
          'Error': 'Missing required token in header, or token is invalid'
        });
      }
    });
  } else {
    callback(400, {
      'Error': 'Missing required field'
    })
  }
};

// Users put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = function (data, callback) {
  console.log(data);
  // Check for required field
  var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  // Check for optional fields
  var firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // Error if phone is invalid
  if (phone) {
    // Error if nothing is sent to update
    if (firstName || lastName || password) {

      // Get the token from the headers
      var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
      // verify that the given token is valid for the phone number
      handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
        if (tokenIsValid) {
          // Lookup the user
          _data.read('users', phone, function (err, userData) {
            if (!err && userData) {
              // Update the fields if necessary
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }
              // Store the new updates
              // console.log(userData);
              _data.update('users', phone, userData, function (err) {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, {
                    'Error': 'Could not update the user.'
                  });
                }
              });
            } else {
              callback(400, {
                'Error': 'Specified user does not exist.'
              });
            }
          });
        } else {
          callback(403, {
            'Error': 'Missing required token in header, or token is invalid'
          });
        }

      })


    } else {
      callback(400, {
        'Error': 'Missing fields to update.'
      });
    }
  } else {
    callback(400, {
      'Error': 'Missing required field.'
    });
  }

};

// users Delete
// Required data: phone
// @TODO Cleanup (delete) any other data files associated with the user
handlers._users.delete = function (data, callback) {
  // Check that phone number is valid
  var phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if (phone) {

    // Get the token from the header
    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
    // verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user
        _data.read('users', phone, function (err, data) {
          if (!err && data) {
            _data.delete('users', phone, function (err) {
              if (!err) {
                callback(200);
              } else {
                callback(500, {
                  'Error': 'Could not delete the specified user'
                });
              }
            });
          } else {
            callback(400, {
              'Error': 'Could not find the specified user.'
            });
          }
        });
      } else {
        callback(403, {
          'Error': 'Missing required token in header, or token is invalid'
        });
      }

    });



  } else {
    callback(400, {
      'Error': 'Missing required field'
    })
  }
};


// Tokens
handlers.tokens = function (data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};


// Container for tokens
handlers._tokens = {};

// Tokens post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function (data, callback) {
  var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  // console.log(data, password);

  if (phone && password) {
    // Lookup The user matching the phone number
    _data.read('users', phone, function (err, userData) {
      if (!err && userData) {
        var hashedPassword = helpers.hash(password);
        if (hashedPassword == userData.hashedPassword) {
          // if valid create a new token with random name set expiration date one hour in the future
          var tokenId = helpers.createRandomString(20);

          var expires = Date.now() + 1000 * 60 * 60;
          var tokenObject = {
            'phone': phone,
            'id': tokenId,
            'expires': expires
          };

          // store the token
          _data.create('tokens', tokenId, tokenObject, function (err) {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, {
                "ERROR": "could not create new token"
              });
            }
          })
        } else {
          callback(400, {
            "Error": "Password does not match the specified user"
          });
        }
      } else {
        callback(400, {
          "Error": "Colud not find specified user"
        })
      }
    })
  } else {
    callback(400, {
      "Error": "Missing required field(s)"
    });
  }
};


// Tokens Get
// Required Data: id
// Optional Data: none
handlers._tokens.get = function (data, callback) {
  // Check that the id is valid
  var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Lookup the token
    _data.read('tokens', id, function (err, tokenData) {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, {
      'Error': 'Missing required field'
    });
  }

}

// Tokens Put
// Required Data: id, extend
// Optional Data: none
handlers._tokens.put = function (data, callback) {
  var id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  var extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
  if (id && extend) {
    // look up the token
    _data.read('tokens', id, function (err, tokenData) {
      if (!err && tokenData) {
        // check to make sure the token isn't expired already
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // store the new updates
          _data.update('tokens', id, tokenData, function (err) {
            if (!err) {
              callback(200);
            } else {
              callback(500, {
                'Error': 'Could not update the token\'s expiration'
              })
            }
          });
        } else {
          callback(400, {
            'Error': 'The token has already expired'
          })
        }
      } else {
        callback(400, {
          'Error': 'Specified token does not exist'
        })
      }
    })
  } else {
    callback(400, {
      'Error': 'Missing required field(s) or field(s) are invalid'
    });
  }

}


// Tokens delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function (data, callback) {
  // Check if id is valid
  var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Lookup the user
    _data.read('tokens', id, function (err, data) {
      if (!err && data) {
        _data.delete('tokens', id, function (err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, {
              'Error': 'Could not delete the specified token'
            });
          }
        });
      } else {
        callback(400, {
          'Error': 'Could not find the specified token.'
        });
      }
    });
  } else {
    callback(400, {
      'Error': 'Missing required field'
    })
  }
};

// Verify if a given id is currently valid for a given user
handlers._tokens.verifyToken = function (id, phone, callback) {
  // Lookup the token
  _data.read('tokens', id, function (err, tokenData) {
    if (!err && tokenData) {
      //check that the token is for the given user and has not expired
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    };
  });
}


// checks

handlers.checks = function (data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// container for all checks methods
handlers._checks = {};

// Checks post
// Required data: protocol, url, method, successCodes,timeoutSeconds
// Optional data: none
handlers._checks.post = function (data, callback) {
  // Validate inputs
  var protocol = typeof (data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  // console.log(protocol,url,method,successCodes,timeoutSeconds);
  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get the token from the headers
    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
    // console.log(token,"Error here");

    // look up the token
    _data.read('tokens', token, function (err, tokenData) {
      if (!err && tokenData) {
        var userPhone = tokenData.phone;

        // Lookup the user data
        _data.read('users', userPhone, function (err, userData) {
          if (!err && userData) {
            var userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
            // Verify that user has less than the number of max-checks per user
            if (userChecks.length < config.maxChecks) {
              // Create random id for check
              var checkId = helpers.createRandomString(20);

              // Create check object including userPhone
              var checkObject = {
                'id': checkId,
                'userPhone': userPhone,
                'protocol': protocol,
                'url': url,
                'method': method,
                'successCodes': successCodes,
                'timeoutSeconds': timeoutSeconds
              };

              // Save the object
              _data.create('checks', checkId, checkObject, function (err) {
                if (!err) {
                  // Add check id to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the new user data
                  _data.update('users', userPhone, userData, function (err) {
                    if (!err) {
                      // Return the data about the new check
                      callback(200, checkObject);
                    } else {
                      callback(500, {
                        'Error': 'Could not update the user with the new check.'
                      });
                    }
                  });
                } else {
                  callback(500, {
                    'Error': 'Could not create the new check'
                  });
                }
              });



            } else {
              callback(400, {
                'Error': 'The user already has the maximum number of checks (' + config.maxChecks + ').'
              })
            }


          } else {
            callback(403);
          }
        });


      } else {
        callback(403);
      }
    });
  } else {
    callback(400, {
      'Error': 'Missing required inputs or inputs are invalid'
    })
  }
}


// Checks -get
// Required data: id
// Optional data:none
handlers._checks.get = function (data, callback) {
  // Check that id is valid
  var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if (id) {

    // Look up the check
    _data.read('checks', id, function (err, checkData) {
      if (!err && checkData) {
        // Get the token from the headers
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        // verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
          if (tokenIsValid) {
            // Return the check data
            callback(200, checkData);
          } else {
            callback(403);
          }
        });
      } else {
        callback(404);
      }
    });

  } else {
    callback(400, {
      'Error': 'Missing required field'
    })
  }
};


// Check -put
// Required data: id
// Optional data: protocol, url, method, succssCodes, timeoutSeconds (one or more must be present)
handlers._checks.put = function(data,callback){
  // Check for the required field
  var id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

  // Check for optional data
  var protocol = typeof (data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  // Check if id is valid
  if(id){

    // Check if there is one or more of the optional data
    if(protocol || url || method || successCodes || timeoutSeconds ){
      // Look up the check
      _data.read('checks',id,function(err,checkData){
        if(!err && checkData){
          // Get the token from the headers
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        // verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
          if(tokenIsValid){
            // Update the check where necesary
            if(protocol){
              checkData.protocol = protocol;
            }
            if(url){
              checkData.url = url;
            }
            if(method){
              checkData.method = method;
            }
            if(successCodes){
              checkData.successCodes = successCodes;
            }
            if(timeoutSeconds){
              checkData.timeoutSeconds = timeoutSeconds;
            }

            // store the updates
            _data.update('checks',id,checkData,function(err){
              if(!err){
                callback(200);
              } else {
                callback(500,{'Error': 'Could not update check'});
              }
            })
          } else {
            callback(403)
          }
        });
          
        } else {
          callback(400, {'Error': 'Check id does not exist'});
        }
      });
    } else {
      callback(400, {'Error': 'Missing fields to update'})
    }
  } else {
    callback(400,{'Error': 'Missing required field'})
  }
}


// Checks - delete
// Required data:  checkid
// Optional data: none
handlers._checks.delete = function (data, callback) {
  // Check if id is valid
  var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Lookup the check
    _data.read('checks', id, function (err, checkData) {
      if (!err && checkData) {
        // Get the token from the header
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        // verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
          if (tokenIsValid) {

            // Delete the check
            _data.delete('checks', id, function (err) {
              if (!err) {

                // Lookup the user
                _data.read('users', checkData.userPhone, function (err, userData) {
                  if (!err && userData) {

                    var userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                    //  remove the deleted check from their lis
                    var checkPosition = userChecks.indexOf(id);
                    if (checkPosition > -1) {
                      userChecks.splice(checkPosition, 1);
                      // Resave the users data
                      _data.update('users', checkData.userPhone, checkData, function (err) {
                        if (!err) {
                          callback(200);
                        } else {
                          callback(500, {
                            'Error': 'Could not update the specified user'
                          });
                        }
                      });

                    } else {
                      callback(500),
                      {
                        'Error': 'Could not find the check on the user\'s object hence coul not remove'
                      }
                    }



                  } else {
                    callback(500, {
                      'Error': 'Could not find the user.who created the check hence could not remove the check from the list of checks on the users object'
                    });
                  }
                });
              } else {
                callback(500, {
                  'Error': 'Could not delete check'
                })
              }
            })
          } else {
            callback(403);
          }

        });
      } else {
        callback(400, {
          'Error': 'The specified check id does not exist.'
        });
      }
    });
  } else {
    callback(400, {
      'Error': 'Missing required field'
    })
  }
};

// Export the handlers
module.exports = handlers;