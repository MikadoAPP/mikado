#! /usr/bin/env node
var fs = require('fs')
, spawn = require('child_process').spawn
, es = require('event-stream')
, through = require('through2')
, crypto = require('crypto')
, yargs = require('yargs')
, async = require('async')
;

var argv = yargs
  .describe('help', 'Display this help message.')
  .alias('help', 'h')
  .describe('private-key', 'The private key used to sign these objects.')
  .alias('private-key', 'p')
  .demand('private-key')
  .argv;

if (argv.h) {
  yargs.showHelp();
}


var tasks = [];
tasks.push(function(done) {
  fs.readFile(argv['private-key'], done);
});

var stream = null;
if (typeof argv._[0] == 'string') {
  stream = fs.createReadStream(argv._[0]);
}
else {
  stream = process.stdin;
}

var signer = function(privateKey, attributeName) {
  var key = privateKey;
  var attributeName = attributeName || 'signature';
  return through.obj(function(data, enc, done) {
    if (data[attributeName] !== undefined) return done(new Error('Signature key was already set'));
    var sign = crypto.createSign('RSA-SHA256');
    sign.write(JSON.stringify(data));
    data[attributeName] = sign.sign(key, 'base64');
    this.push(data);
    done();
  });
}


async.parallel(tasks, function(error, data) {
  var privateKey = data[0];
  stream
    .pipe(es.split())
    .pipe(es.parse())
    .pipe(signer(privateKey))
    .pipe(es.stringify())
    .pipe(process.stdout)
  ;
});
