#! /usr/bin/env node
var through = require('through2')
   ,fs = require('fs')
   ,crypto = require('crypto')
;

/**
 * Produces an instance of the verifier through stream.
 */
var Verifier = function(options) {
  var key = options.publicKey;
  var attributeName = options.attributeName || 'signature';
  var algorithm = options.algorithm || 'RSA-SHA256';
  var includeSignature = options.includeSignature || false;
  return through.obj(function(data, enc, done) {
    var verify = crypto.createVerify(algorithm);
    var signature = data[attributeName];
    delete data.signature;
    verify.write(JSON.stringify(data));
    if (verify.verify(key, signature, 'base64')) {
      if (includeSignature) {
        data[attributeName] = signature;
      }
      this.push(data);
    }
    done();
  });
};

/**
 * Set command line options.
 */
Verifier.options = function(yargs) {
  return yargs
    .describe('help', 'Display this help message.')
    .alias('help', 'h')
    .describe('public-key', 'The public key used to verify these signatures.')
    .alias('public-key', 'p')
    .demand('public-key')
    .describe('include-signature', 'Include the signature in emitted events.')
    .alias('Include-signature', 'i')
  ;
};

/**
 * Load the public key.
 */
Verifier.prepareOptions = function(options, done) {
  fs.readFile(options.publicKey, function(error, data) {
    options.publicKey = data;
    done(error, options);
  });
}

module.exports = Verifier;
