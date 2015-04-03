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

var signer = function(privateKey) {
  var key = privateKey;
  return through.obj(function(data, enc, done) {
    var sign = crypto.createSign('RSA-SHA256');
    sign.write(JSON.stringify(data));
    data.signature = sign.sign(key, 'base64');
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
