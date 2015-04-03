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
  .describe('public-key', 'The public key used to verify these signatures.')
  .alias('public-key', 'p')
  .demand('public-key')
  .argv;

if (argv.h) {
  yargs.showHelp();
}


var tasks = [];
tasks.push(function(done) {
  fs.readFile(argv['public-key'], done);
});

var stream = null;
if (typeof argv._[0] == 'string') {
  stream = fs.createReadStream(argv._[0]);
}
else {
  stream = process.stdin;
}

var signer = function(publicKey) {
  var key = publicKey;
  return through.obj(function(data, enc, done) {
    var verify = crypto.createVerify('RSA-SHA256');
    var signature = data.signature;
    delete data.signature;
    verify.write(JSON.stringify(data));
    if (verify.verify(key, signature, 'base64')) {
      //*/
      this.push(data);
    }
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
