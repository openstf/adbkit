// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Fs = require('fs')

class Stats extends Fs.Stats {
  static initClass() {
    // The following constant were extracted from `man 2 stat` on Ubuntu 12.10.
    this.S_IFMT   = 0o170000 // bit mask for the file type bit fields
    this.S_IFSOCK = 0o140000 // socket
    this.S_IFLNK  = 0o120000 // symbolic link
    this.S_IFREG  = 0o100000 // regular file
    this.S_IFBLK  = 0o060000 // block device
    this.S_IFDIR  = 0o040000 // directory
    this.S_IFCHR  = 0o020000 // character device
    this.S_IFIFO  = 0o010000 // FIFO
    this.S_ISUID  = 0o004000 // set UID bit
    this.S_ISGID  = 0o002000 // set-group-ID bit (see below)
    this.S_ISVTX  = 0o001000 // sticky bit (see below)
    this.S_IRWXU  = 0o0700   // mask for file owner permissions
    this.S_IRUSR  = 0o0400   // owner has read permission
    this.S_IWUSR  = 0o0200   // owner has write permission
    this.S_IXUSR  = 0o0100   // owner has execute permission
    this.S_IRWXG  = 0o0070   // mask for group permissions
    this.S_IRGRP  = 0o0040
    // group has read permission
  }

  constructor(mode, size, mtime) {
    super()
    this.mode = mode
    this.size = size
    this.mtime = new Date(mtime * 1000)
  }
}
Stats.initClass()

module.exports = Stats
