Promise = require 'bluebird'
forge = require 'node-forge'
BigInteger = forge.jsbn.BigInteger

###
The stucture of an ADB RSAPublicKey is as follows:

    #define RSANUMBYTES 256           // 2048 bit key length
    #define RSANUMWORDS (RSANUMBYTES / sizeof(uint32_t))

    typedef struct RSAPublicKey {
        int len;                  // Length of n[] in number of uint32_t
        uint32_t n0inv;           // -1 / n[0] mod 2^32
        uint32_t n[RSANUMWORDS];  // modulus as little endian array
        uint32_t rr[RSANUMWORDS]; // R^2 as little endian array
        int exponent;             // 3 or 65537
    } RSAPublicKey;

###
class Auth
  # coffeelint: disable=max_line_length
  RE = /^((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)\0? (.*)\s*$/
  # coffeelint: enable=max_line_length

  readPublicKeyFromStruct = (struct, comment) ->
    throw new Error "Invalid public key" unless struct.length

    # Keep track of what we've read already
    offset = 0

    # Get len
    len = struct.readUInt32LE(offset) * 4
    offset += 4

    unless struct.length is 4 + 4 + len + len + 4
      throw new Error "Invalid public key"

    # Skip n0inv, we don't need it
    offset += 4

    # Get n
    n = new Buffer len
    struct.copy(n, 0, offset, offset + len)
    [].reverse.call(n)
    offset += len

    # Skip rr, we don't need it
    offset += len

    # Get e
    e = struct.readUInt32LE(offset)

    unless e is 3 or e is 65537
      throw new Error "Invalid exponent #{e}, only 3 and 65537 are supported"

    # Restore the public key
    key = forge.pki.setRsaPublicKey(
      new BigInteger(n.toString('hex'), 16)
      new BigInteger(e.toString(), 10)
    )

    # It will be difficult to retrieve the fingerprint later as it's based
    # on the complete struct data, so let's just extend the key with it.
    md = forge.md.md5.create()
    md.update struct.toString('binary')
    key.fingerprint = md.digest().toHex().match(/../g).join(':')

    # Expose comment for the same reason
    key.comment = comment

    return key

  @parsePublicKey = (buffer) ->
    new Promise (resolve, reject) ->
      if match = RE.exec(buffer)
        struct = new Buffer(match[1], 'base64')
        comment = match[2]
        resolve readPublicKeyFromStruct struct, comment
      else
        reject new Error "Unrecognizable public key format"

module.exports = Auth
