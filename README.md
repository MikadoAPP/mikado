# The Mikado 帝

![Ko-Ko](https://upload.wikimedia.org/wikipedia/commons/2/2e/KoKo_1926.jpg)

An extremely light and easy to understand parallel execution and orchestration framework.

This project is very much a work in progress. This is an experiment in making an extremely
light weight parallel execution and orchestration framework like [mcollective](https://puppetlabs.com/mcollective),
[saltstack](http://saltstack.com/), or [func](https://fedorahosted.org/func/) but drawing
inspiration from composeable architecutres like [sensu](http://sensuapp.org/).  The goal is
to, like sensu, have something that's incredibly easy to understand and maintian by combining
small clean unixy components.

At present, The Mikado is built entirely out of node.js streams. The idea is to buy into the
[unix philosophy](http://www.faqs.org/docs/artu/ch01s06.html) and to really
[embrace streams](https://github.com/substack/stream-handbook) as the cornerstone of the project.
Small pieces loosely joined that use text streams to communicate.  All of these streams can be
used either as an executeable binary (very useful for learning the pieces and debugging) or they
can be imported as libraries in a node.js app to create an easily deployable app.

## What's with the Name?

Mikado is an [obsolete English term for the emperror of Japan](http://en.wikipedia.org/wiki/Emperor_of_Japan).
This project is named for the emperor in Gilbert and Sullivan's [The Mikado](http://en.wikipedia.org/wiki/The_Mikado).
Just as the Mikado in the play has a Lord High Executioner that does his bidding, this project gives you the
executioner to do whatever dirty work you need done.  I recommend naming your instance
[Ko-Ko](http://web.stcloudstate.edu/scogdill/mikado/names.html#koko).

## The Components

- [The Exceutor](#executor)
- [The Signer](#signer)
- [The Verifier](#verifier)

### The Executor<a name="executor" />

The executor is a through stream that accepts input commands telling it what processes to start, stop, and writes to stdin
and outputs a single stream of events that happened on the child.

#### Input

The Executor accepts an object stream of with the following schema:

  - `command`: The command to execute.
  - `cwd`: The directory from which to execute it (optional).
  - `env`: A hash of environment variables (if specified, it overwrites the existing ones, if not the processes own are used (optional).
  - **TODO**: `id`: If specified, this should be the unique id of this execution, if not specified one should be identified and added.
  - **TODO**: `action`: Can be one of `start`, `kill`, or `write`. Defaults to `start`.
  - **TODO**: `input`: If action is `kill` this is the string of the signal to send to the child. If action is `write` this will be written to
    stdin on the child process.
  - **TODO**: `inputEncoding`: If `action` is `write` the encoding of the `input` key, accepts utf8 and base64 - defaults to utf8.

#### Output

The Executor emits objects of the following structure:

  - `type`: What type of event is being emitted, posibilities are `log` if it's written to stdin or emitted from stdout or stderr on a child
    process or `command start`, `command error`, `command close`, and `command exit` events that are happening to the child.
  - `stream`: If this is a `log` type event this will be set and indicate whether this was emitted on `stdout` or `stderr`.
  - `command`: The command that was being run.
  - `time`: The timestamp event was emitted.
  - `pid`: For `command *` type events, this is the pid of the executor. For `log` type events, this is the pid of the process.
  - `code`: For `command close` or `command exit` events, this will be the exit code from the process.
  - `signal`: For `command close` or `command exit` events, this will be the string name of the signal used to kill the process
    if a signal was sent to the process.
  - **TODO**: `id`: This should be the unique id of this execution job.

### The Signer<a name="signer" />

The signer signs every json document by stringifying it, signing it with a provided public key, and
then adding a `signature` attribute to the document. This ensures that the origin of the message can
be trusted and that it was not modified in transit after signing. It in no way protects the message
because the message is signed, not encrypted. Messages should be transmitted over SSL or encrypted via
another transform stream.

#### Input

Any javascript object.  The object does not require any field to be *present* but `signature` should be **absent**.
If a field called `signature` exists then it will throw an error.

#### Output

The output is a javascript object that is identical to the input but with a `signature` field that contains the body
of the entire json document stringified and signed with a public key.

#### Usage:

```` bash
cat some-commands.json.log | node lib/signer.js --private-key=~/.ssh/id_rsa
````

### The Verifier<a name="verifier" />

The verifier verifies signatures produced by [The Signer](#signer). You provide the verifier with a public key and it
then removes the signature key from the document, converts it to a string (via `JSON.stringify`), verifies the signature
from the document, and if the document was successfully verified, it emits the object with the signature removed.

#### Usage:

```` bash
# Note the public key file needs to be in PEM format.  See below for conversion instructions.
node lib/signer.js --private-key=/some/private.key some-commands.json.log | node lib/verifier.js --public-key=/some/public.key.pem
# The output of this command should be identical to `cat some-commands.json.log` (but you'd normally have some network operation in between.
````

#### Creating a suitable PEM formatted public key

A certificate suitable for use by the verifier can be generated from the user's private key.

```` bash
openssl rsa -in ~/.ssh/id_rsa -pubout -out idrsa.pub.pem
````
