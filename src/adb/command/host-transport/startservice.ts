import StartActivityCommand, { StartActivityOptions } from './startactivity';

export default class StartServiceCommand extends StartActivityCommand {
    execute(options: StartActivityOptions) {
        const args = this._intentArgs(options);
        if (options.user || options.user === 0) {
            args.push('--user', this._escape(options.user));
        }
        return this._run('startservice', args);
    }
}
