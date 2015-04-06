#! /usr/bin/env node
var fs = require('fs');
var spawn = require('child_process').spawn;
var es = require('event-stream');
var through2 = require('through2');

var MikadoExecutor = function(stream) {
  this.outputStream = through2.obj();
  this.outputStream
    .pipe(es.stringify())
    .pipe(process.stdout);
  stream.pipe(this.getProcessStream());
};

MikadoExecutor.prototype.getProcessStream = function() {
  var self = this;
  var parseStream = es.through();
  parseStream
    .pipe(es.split())
    .pipe(es.parse())
    .pipe(this.processCommandStream())
    .pipe(es.stringify())
    .pipe(process.stdout)
  ;
  return parseStream;
};

MikadoExecutor.prototype.processCommandStream = function(command) {
  var self = this;
  return es.through(function(command) {
    var env = command.env || process.env;
    var args = command.args || [];
    var options = {
      env: env,
      cwd: process.cwd(),
    };
    if (command.uid) {
      options.uid = command.uid;
    }
    if (command.gid) {
      options.gid = command.gid;
    }
    self.outputStream.write({
      type: 'command start',
      pid: process.pid,
      time: new Date().toISOString(),
      command: command.command,
      options: options,
    });
    var child = spawn(command.command, args, options);
    child.on('error', function() { console.log(arguments); });
    var endHandler = function(type) {
      var exitType = type;
      return function(code, signal) {
        self.outputStream.write({
          type: 'command ' + exitType,
          pid: process.pid,
          time: new Date().toISOString(),
          code: code,
          signal: signal,
          command: command.command,
          options: options,
        });
      };
    };
    child.on('error', endHandler('error'));
    child.on('exit', endHandler('exit'));
    child.on('close', endHandler('close'));
    child.stdout
      .pipe(es.split())
      .pipe(self.createEventStream({ type: 'log', stream: 'stderr', command: command.command, pid: child.pid }))
      .pipe(self.outputStream, {end: false});
    child.stderr
      .pipe(es.split())
      .pipe(self.createEventStream({ type: 'log', stream: 'stdout', command: command, pid: child.pid }))
      .pipe(self.outputStream, {end: false});
  });
};


/**
 * Get a throughstream that wraps all data passed through.
 *
 * @param {string} name A unique name for this event stream.
 * @param {string} command The name of the command.
 * @param {string} streamName The name of this stream (e.g. stdout or stderr).
 * @return {stream} A throughstream that wraps string input.
 */
MikadoExecutor.prototype.createEventStream = function(attributes) {
  var number = 0;
  return through2.obj(function(data, enc, done) {
    // Do not emit empty lines.
    if (data === '') {
      return;
    }
    data = {
      message: data.toString(),
      time: new Date().toISOString(),
      order: number,
    };
    var property = null;
    for (property in attributes) {
      if (attributes.hasOwnProperty(property)) {
        data[property] = attributes[property];
      }
    }
    number++;
    this.push(data);
    done();
  });
};

var executor = null;

if (process.argv[2]) {
  var commands = fs.createReadStream(process.argv[2]);
  executor = new MikadoExecutor(commands);
}
else {
  executor = new MikadoExecutor(process.stdin);
}
