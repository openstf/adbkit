fs = require 'fs'

program = require 'commander'
Promise = require 'bluebird'
forge = require 'node-forge'

pkg = require '../package'
auth = require './adb/auth'

Promise.longStackTraces()

program
  .version pkg.version

program
  .command 'convert-pubkey <file>'
  .option '-f, --format <format>', 'format (pem or openssh)', String, 'pem'
  .description 'Converts an ADB-generated public key into PEM format.'
  .action (file, options) ->
    key = auth.parsePublicKey fs.readFileSync file
    out = process.stdout
    switch options.format.toLowerCase()
      when 'pem'
        out.write forge.pki.publicKeyToPem(key).trim()
      when 'openssh'
        out.write forge.ssh.publicKeyToOpenSSH(key, 'adbkey').trim()
      else
        console.error "Unsupported format '#{options.format}'"
        process.exit 1

program.parse process.argv
