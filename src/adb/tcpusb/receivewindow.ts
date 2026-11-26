import { INITIAL_WINDOW } from './sendwindow';

/**
 * What the client may still send us on one stream before we ack it. Without adb's `delayed_ack` feature it waits for
 * each A_OKAY, so one A_WRTE at a time. With it, the credit we gave: INITIAL_WINDOW, topped up by each A_OKAY. adb
 * sends while it has any credit left, so its last packet may go past the credit by up to one payload.
 *
 * Writes the client sends past that would only pile up in our memory while the device side reads slowly.
 */
export default class ReceiveWindow {
  private inFlight = 0;
  private readonly limit: number;

  constructor(
    private readonly delayed: boolean,
    maxPayload: number,
  ) {
    this.limit = delayed ? INITIAL_WINDOW + maxPayload : 1;
  }

  /** Counts an A_WRTE we pass on; false if the client sent more than it was allowed. */
  public take(bytes: number): boolean {
    this.inFlight += this.delayed ? bytes : 1;
    return this.inFlight <= this.limit;
  }

  /** The bytes from take() were written, so the client may send them again. */
  public release(bytes: number): void {
    this.inFlight -= this.delayed ? bytes : 1;
  }
}
