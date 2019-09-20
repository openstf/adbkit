/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const fs = require('fs');
const program = require('commander');
const Promise = require('bluebird');
const forge = require('node-forge');

const pkg = require('../package');
const Adb = require('./adb');
const Auth = require('./adb/auth');
const PacketReader = require('./adb/tcpusb/packetreader');

Promise.longStackTraces();

program
  .version(pkg.version);

program
  .command('pubkey-convert <file>')
  .option('-f, --format <format>', 'format (pem or openssh)', String, 'pem')
  .description('Converts an ADB-generated public key into PEM format.')
  .action((file, options) => Auth.parsePublicKey(fs.readFileSync(file))
  .then(function(key) {
    switch (options.format.toLowerCase()) {
      case 'pem':
        return console.log(forge.pki.publicKeyToPem(key).trim());
      case 'openssh':
        return console.log(forge.ssh.publicKeyToOpenSSH(key, 'adbkey').trim());
      default:
        console.error(`Unsupported format '${options.format}'`);
        return process.exit(1);
    }
}));

program
  .command('pubkey-fingerprint <file>')
  .description('Outputs the fingerprint of an ADB-generated public key.')
  .action(file => Auth.parsePublicKey(fs.readFileSync(file))
  .then(key => console.log('%s %s', key.fingerprint, key.comment)));

program
  .command('usb-device-to-tcp <serial>')
  .option('-p, --port <port>', 'port number', String, 6174)
  .description('Provides an USB device over TCP using a translating proxy.')
  .action(function(serial, options) {
    const adb = Adb.createClient();
    const server = adb.createTcpUsbBridge(serial, {auth() { return Promise.resolve(); }})
      .on('listening', () => console.info('Connect with `adb connect localhost:%d`', options.port)).on('error', err => console.error(`An error occured: ${err.message}`));
    return server.listen(options.port);
});

program
  .command('parse-tcp-packets <file>')
  .description('Parses ADB TCP packets from the given file.')
  .action(function(file, options) {
    const reader = new PacketReader(fs.createReadStream(file));
    return reader.on('packet', packet => console.log(packet.toString()));
});

program.parse(process.argv);
