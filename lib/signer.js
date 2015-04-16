#! /usr/bin/env node
var fs = require('fs')
   ,through = require('through2')
   ,crypto = require('crypto')
   ,async = require('async')
;

/**
 * Returns a transform stream that signs JSON documents.
 *
 * @param options
 *   A hash of options.
 * options.privateKey: the string or buffer representing the private key (to be passed to a
 *                     crypto.sign object.
 * options.attributeName: The 
 * options.algorithm: The hashing algorithm to use in the signing process, defaults to RSA-SHA256.
 */
var Signer = function(options) {
  var key = options.privateKey;
  if (!key) throw new Error('You must supply a private key.');
  var attributeName = options.attributeName || 'signature';
  var algorithm = options.algorithm || 'RSA-SHA256';
  return through.obj(function(data, enc, done) {
    if (data[attributeName] !== undefined) return done(new Error('Signature key was already set'));
    var sign = crypto.createSign(algorithm);
    sign.write(JSON.stringify(data));
    data[attributeName] = sign.sign(key, 'base64');
    this.push(data);
    done();
  });
}

/**
 * Set any command line options.
 */
Signer.options = function(yargs) {
  return yargs
    .describe('help', 'Display this help message.')
    .alias('help', 'h')
    .describe('private-key', 'The private key used to sign these objects.')
    .alias('private-key', 'p')
    .demand('private-key');
}

/**
 * Load the private key.
 */
Signer.prepareOptions = function(options, done) {
  fs.readFile(options.privateKey, function(error, data) {
    options.privateKey = data;
    done(error, options);
  });
}

module.exports = Signer;
