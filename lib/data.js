/**
 * Library for storing and emitting data
 */

// Dependecies
var fs = require('fs');
var path =  require('path');

// Container for the module (to be exported)
var lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname,'/../.data/');

// Write data to a file
lib.create = function(dir,file,data,callback){
    // Open the file for writing
    fs.open(lib.baseDir+dir+'/'+file+'.json','wx',function(err,fileDescriptor){
        if(!err && fileDescriptor){
            // Convert data to string
            var stringData = JSON.stringify(data);

            // Write to file and close it
            fs.writeFile(fileDescriptor,stringData, function(er){
                if(!err){
                    fs.close(fileDescriptor,function(err){
                        if(!err){
                            callback(false);
                        } else {
                            callback('Error closing new file')
                        }
                    })
                } else {
                    callback('Error while writing new file');
                }
            })
        } else {
            callback('Could not create new file, it may already exist');
        }
    });
};

// Read data from file
lib.read = function(dir,file,callback){
    fs.readFile(lib.baseDir+dir+'/'+file+'.json','utf8',function(err,data){
        callback(err,data);
    });
};


// Update file with new data
lib.update = function(dir,file,data){
    //open the file for writting
    fs.open(lib.baseDir+dir+'/'+file+'.json','r+', function(err,fileDescriptor){
        if(!err && fileDescriptor){
            // Convert data into string
            var stringData = JSON.stringify(data);

            // Truncate the file
            fs.ftruncate(fileDescriptor,function(err){
                if(!err){
                    // Write to file and close
                    fs.writeFile(fileDescriptor, stringData,function(err){
                        if(!err){
                          fs.close(fileDescriptor,function(err){
                            if(!err){
                              console.log(false);
                            } else {
                              callback('Error closing existing file');
                            }
                          });
                        }else {
                            callback('Error writing to existing file')
                        }
                    })
                }else {
                    callback('Error truncating the file')
                }
            })
        } else {
            callback('Could not open the file for updating, it may not exist yet!')
        }
    })
}

// Delete a file
lib.delete = function(dir,file,callback){
    // unlink the file
    fs.unlink(lib.baseDir+dir+'/'+file+'.json',function(err){
        if(!err){
            callback(false);
        } else {
            callback('Error deleting file')
        }
    })
}

// Export the module
module.exports = lib;