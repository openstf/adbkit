import d from 'debug';
import Command from '../../command';
import Protocol from '../../protocol';
import Parser from '../../parser';
import PairResult from '../../../PairResult';

const debug = d('adb:command');

// The server pairs in a service thread, so it answers OKAY as soon as that
// thread starts, then sends the outcome:
// - success: "Successfully paired to 192.168.1.5:37000 [guid=adb-...]" as a
//   length-prefixed string
// - failure: a second status, FAIL, and the message, for example
//   "Failed: Unable to start pairing client." (nothing listens on the port),
//   "Failed: Wrong password or connection was dropped." or
//   "Invalid port while parsing address [192.168.1.5]"
// Servers older than platform-tools 30 reply FAIL right away.
const RE_SUCCESS = /^Successfully paired to (\S+)(?: \[guid=([^\]]*)\])?/;
const RE_LENGTH = /^[0-9a-fA-F]{4}$/;
const RE_BRACKETED = /^\[([^\]]+)\](?::(\d+))?$/;
const RE_HOST_PORT = /^([^:]+):(\d+)$/;

export default class HostPairCommand extends Command<PairResult> {
  /**
   * Splits a pairing address, `host:port` or `[ipv6]:port`, as shown in the device's dialog.
   */
  static parseAddress(address: string): { host: string; port: number } {
    const match = typeof address === 'string' ? RE_BRACKETED.exec(address) || RE_HOST_PORT.exec(address) : null;
    if (!match || !match[2]) {
      throw new TypeError(`Expected the pairing address as 'host:port' or '[ipv6]:port', got '${address}'`);
    }
    return { host: match[1], port: Number(match[2]) };
  }

  /**
   * Checks the arguments and returns the address part of the request: `host:port`, or `[host]:port` for IPv6.
   * The server splits `host:pair:<code>:<address>` at the first `:` after the code, so the code can't contain one.
   */
  static address(host: string, port: number, code: string): string {
    if (typeof code !== 'string' || code === '' || code.includes(':')) {
      throw new TypeError(
        typeof code === 'number'
          ? 'Pass the pairing code as a string: a number loses a leading zero'
          : "The pairing code must be a non-empty string without ':'",
      );
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new TypeError(`Expected the pairing port as an integer from 1 to 65535, got ${port}`);
    }
    if (typeof host !== 'string') {
      throw new TypeError(`Expected the host as a string, got ${typeof host}`);
    }
    const bracketed = RE_BRACKETED.exec(host);
    if (bracketed && bracketed[2]) {
      throw new TypeError(`The host '${host}' includes a port; pass it as pair('${host}', code) instead`);
    }
    const bare = bracketed ? bracketed[1] : host;
    if (bare === '' || /\s/.test(bare)) {
      throw new TypeError(`Invalid host '${host}'`);
    }
    if (RE_HOST_PORT.test(bare)) {
      throw new TypeError(`The host '${host}' includes a port; pass it as pair('${host}', code) instead`);
    }
    return bare.includes(':') ? `[${bare}]:${port}` : `${bare}:${port}`;
  }

  execute(host: string, port: number, code: string): Promise<PairResult> {
    let address: string;
    try {
      address = HostPairCommand.address(host, port, code);
    } catch (err) {
      this.connection.end();
      return Promise.reject(err);
    }
    // Written directly rather than with _send(), whose debug log would show the code.
    const encoded = Protocol.encodeData(`host:pair:${code}:${address}`);
    if (debug.enabled) {
      debug(`Send '${encoded.toString().replace(`host:pair:${code}:`, 'host:pair:******:')}'`);
    }
    this.connection.write(encoded);
    return this.parser
      .readAscii(4)
      .then((reply) => {
        switch (reply) {
          case Protocol.OKAY:
            return this._readOutcome();
          case Protocol.FAIL:
            return this.parser.readError();
          default:
            return this.parser.unexpected(reply, 'OKAY or FAIL');
        }
      })
      .finally(() => {
        // The server closes the connection after the reply. End our side too,
        // also when the reply is cut short or times out.
        this.connection.end();
      });
  }

  private _readOutcome(): Promise<PairResult> {
    return this.parser
      .readAscii(4)
      .then((status) => {
        if (status === Protocol.FAIL) {
          return this.parser.readError();
        }
        if (status === Protocol.OKAY) {
          return this.parser.readValue();
        }
        if (RE_LENGTH.test(status)) {
          return this.parser.readBytes(Protocol.decodeLength(status));
        }
        return this.parser.unexpected(status, 'FAIL or a length-prefixed reply');
      })
      .then((value) => {
        const reply = value.toString();
        const match = RE_SUCCESS.exec(reply);
        if (!match) {
          // Same error type as a FAIL status, so callers handle one kind.
          throw new Parser.FailError(reply);
        }
        const result: PairResult = { address: match[1], reply };
        if (match[2]) {
          result.guid = match[2];
        }
        return result;
      });
  }
}
