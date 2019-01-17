import { Stats as FsStats } from 'fs';

export default class Stats extends FsStats {
    // The following constant were extracted from `man 2 stat` on Ubuntu 12.10.
    static readonly S_IFMT = 0o170000; // bit mask for the file type bit fields
    static readonly S_IFSOCK = 0o140000; // socket
    static readonly S_IFLNK = 0o120000; // symbolic link
    static readonly S_IFREG = 0o100000; // regular file
    static readonly S_IFBLK = 0o060000; // block device
    static readonly S_IFDIR = 0o040000; // directory
    static readonly S_IFCHR = 0o020000; // character device
    static readonly S_IFIFO = 0o010000; // FIFO
    static readonly S_ISUID = 0o004000; // set UID bit
    static readonly S_ISGID = 0o002000; // set-group-ID bit (see below)
    static readonly S_ISVTX = 0o001000; // sticky bit (see below)
    static readonly S_IRWXU = 0o0700; // mask for file owner permissions
    static readonly S_IRUSR = 0o0400; // owner has read permission
    static readonly S_IWUSR = 0o0200; // owner has write permission
    static readonly S_IXUSR = 0o0100; // owner has execute permission
    static readonly S_IRWXG = 0o0070; // mask for group permissions
    static readonly S_IRGRP = 0o0040;
    // group has read permission

    mtime: Date;

    constructor(public mode: number, public size: number, mtime: number) {
        super();
        this.mtime = new Date(mtime * 1000);
    }
}
