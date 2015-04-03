# The Mikado

![Ko-Ko](https://upload.wikimedia.org/wikipedia/commons/2/2e/KoKo_1926.jpg)

An extremely light and easy to understand parallel execution and orchestration framework.

This project is very much a work in progress. This is an experiment in making an extremely
light weight parallel execution and orchestration framework like [mcollective](https://puppetlabs.com/mcollective), [saltstack](http://saltstack.com/), or [func](https://fedorahosted.org/func/) but
drawing inspiration from composeable architecutres like [sensu](http://sensuapp.org/).  The
goal is to, like sensu, have something that's incredibly easy to understand and maintian
though small clean components.

The Mikado is built entirely out of node.js streams. The idea is to buy into the [unix philosophy]()
and to really [embrace streams](https://github.com/substack/stream-handbook) as the cornerstone
of the project. Small pieces loosely joined that use text streams to communicate.  All of these streams
can be used either as an executeable binary (very useful for learning the pieces and debugging) or they
can be imported as libraries in a node.js app to create an easily deployable app.

## What's with the Name?

This project is named for the emperor in Gilbert and Sullivan's [The Mikado](http://en.wikipedia.org/wiki/The_Mikado). Just as the Mikado in the play has a Lord High Executioner that does his bidding,
this project gives you the executioner to do whatever dirty work you need done.  I recommend
naming your instance [Ko-Ko]().

## The Components

### The Executor

The executor is a through stream that accepts an object stream of with the following schema:

  - `command`: The command to execute.
  - `cwd`: The directory from which to execute it (optional).
  - `env`: A hash of environment variables (if specified, it overwrites the existing ones, if not the processes own are used (optional).

The stream emits objects of the following structure:

  - `stream`: Whether this was emitted on stdout or stderr.
  - `command`: The command that was being run.
  - `time`: 

### The Signer

The signer signs every json document by stringifying it, signing it with a provided public key, and
then adding a `signature` attribute to the document. This allows the origin of the message to be trusted.
This ensures that the origin of the message can be trusted and that it was not modified in transit after
signing. It in no way protects the message because the message is signed, not encrypted.

Usage:

```` bash
cat some-commands.json.log | node lib/signer.js --private-key=~/.ssh/id_rsa
````

### The Verifier

The verifier verifies signatures produced by The Signer (see above). It only emits messages where the 

Usage:

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
