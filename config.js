/**
 * Create and export configuration variables
 */

// Container for all environments
var environments = {};

// Staging (default) environment
environments.staging = {
    'port': 3000,
    'envName': 'staging'
};

// Production environment
environments.production = {
    'port': 5000,
    'envName' : 'production'
};

// Determine which environment was passwed as a command-line arg
var currrentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase(): '';

// check if the current environment is one of the environments above, if not default to staging
var environmentToExport = typeof(environments[currrentEnvironment]) == 'object' ? environments[currrentEnvironment] : environments.staging;

// Export the Module
module.exports = environmentToExport;
