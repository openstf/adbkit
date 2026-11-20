/**
 * What `client.pair()` resolves with.
 */
export default interface PairResult {
  /**
   * The address the server paired with, as it reports it: the device's
   * pairing address (`host:port`). It isn't a serial; call `client.connect()`
   * with the device's connect port to get one.
   */
  address: string;
  /**
   * The device's ADB GUID, if the server reported one.
   */
  guid?: string;
  /** The server's reply as is, e.g. `Successfully paired to <host:port> [guid=<guid>]`. */
  reply: string;
}
