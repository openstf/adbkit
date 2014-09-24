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
readPublicKeyFromStruct = (struct) ->
  offset = 0

  # Get len
  len = struct.readUInt32LE(offset) * 4
  offset += 4

  # Skip n0inv, we don't need it
  offset += 4

  # Get n
  n = [].reverse.call(struct.slice(offset, offset + len))
  offset += len

  # Skip rr, we don't need it
  offset += len

  # Get e
  e = [].reverse.call(struct.slice(offset, offset + 4))

  forge.pki.setRsaPublicKey(
    new BigInteger(n.toString('hex'), 16)
    new BigInteger(e.toString('hex'), 16)
  )

module.exports.parsePublicKey = (buffer) ->
  [base64EncodedKey] = buffer.toString().split ' ', 1
  readPublicKeyFromStruct new Buffer base64EncodedKey, 'base64'
