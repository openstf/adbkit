import Parser from './parser';
import Auth from './auth';
import { Duplex } from 'stream';

export const readAll = (stream: Duplex, signal?: AbortSignal) =>
    new Parser(stream).readAll(signal);

export const parsePublicKey = (keyString: Buffer) =>
    Auth.parsePublicKey(keyString);
