import { createWriteStream } from 'fs';

let dump: (chunk: any) => any;

if (process.env.ADBKIT_DUMP) {
    const out = createWriteStream('adbkit.dump');
    dump = function(chunk) {
        out.write(chunk);
        return chunk;
    };
} else {
    dump = chunk => chunk;
}

export default dump;
