import Protocol from '../../protocol';
import Command from '../../command';
import InstallOptions from '../../../InstallOptions';

const OKAY_OUTPUT_REGEXP = /^(Success|Failure \[(.*?)\]|Exception)(.*)$/;
const INSTALL_EXCEPTION_CODE = 'INSTALL_EXCEPTION';

class InstallError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export default class InstallCommand extends Command<boolean> {
  /**
   * Builds the `pm install` arguments. Throws a TypeError for options it can't use.
   */
  private _args(apk: string, options?: InstallOptions): string[] {
    // The README used to list a callback as the second argument of install()
    // and installRemote(), so a function, null or undefined means no options.
    if (Array.isArray(options)) {
      throw new TypeError('Pass the install options as an object, such as { allowDowngrade: true }, not as an array');
    }
    const opts: InstallOptions = typeof options === 'object' && options !== null ? options : {};
    const extra = opts.args ?? [];
    if (!Array.isArray(extra) || extra.some((arg) => typeof arg !== 'string')) {
      throw new TypeError("The install option 'args' must be an array of strings, such as ['--user', '10']");
    }
    const args: string[] = [];
    if (opts.reinstall !== false) {
      args.push('-r');
    }
    if (opts.allowDowngrade) {
      args.push('-d');
    }
    if (opts.grantPermissions) {
      args.push('-g');
    }
    if (opts.allowTestPackages) {
      args.push('-t');
    }
    // Single quotes, as in startActivity(), so the shell passes every
    // character on unchanged, '!' included.
    for (const arg of extra) {
      args.push(`${this._escape(arg)}`);
    }
    args.push(`${this._escape(apk)}`);
    return args;
  }

  execute(apk: string, options?: InstallOptions): Promise<boolean> {
    let args: string[];
    try {
      args = this._args(apk, options);
    } catch (err) {
      // Nothing was sent; close the transport so the socket isn't left open.
      this.connection.end();
      return Promise.reject(err);
    }
    this._send(`shell:pm install ${args.join(' ')}`);
    return this.parser.readAscii(4).then((reply) => {
      switch (reply) {
        case Protocol.OKAY:
          return this.parser
            .searchLine(OKAY_OUTPUT_REGEXP)
            .then((match) => {
              if (match[1] === 'Success') {
                return true;
              } else if (match[1] === 'Exception') {
                return this.parser.readLine().then((buffer: Buffer) => {
                  throw new InstallError(buffer.toString(), INSTALL_EXCEPTION_CODE);
                });
              } else {
                // Newer Android prints 'Failure [INSTALL_FAILED_X: description]'
                // while older versions print 'Failure [INSTALL_FAILED_X]'. The
                // code is the reason alone; the message keeps the whole text.
                const reason = match[2];
                const code = reason.split(':')[0].trim();
                throw new InstallError(`${apk} could not be installed [${reason}]`, code);
              }
            })
            .finally(() => {
              return this.parser.readAll();
            });
        case Protocol.FAIL:
          return this.parser.readError();
        default:
          return this.parser.unexpected(reply, 'OKAY or FAIL');
      }
    });
  }
}
