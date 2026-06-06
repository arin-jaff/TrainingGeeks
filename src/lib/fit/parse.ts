import { Decoder, Stream } from "@garmin/fitsdk";
import { gunzipSync } from "node:zlib";

export interface FitMessages {
  // Raw decoded message groups, keyed like "recordMesgs", "sessionMesgs", ...
  [group: string]: Record<string, unknown>[] | undefined;
}

export interface DecodedFit {
  messages: FitMessages;
  errors: unknown[];
  /** The decompressed FIT bytes (gzip transparently removed). */
  bytes: Uint8Array;
}

function isGzip(buf: Uint8Array): boolean {
  return buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

/**
 * Decode a FIT file. Accepts raw `.fit` bytes or gzipped `.fit.gz` (the form
 * TrainingPeaks / intervals.icu exports use) and decompresses transparently.
 */
export function decodeFit(input: Uint8Array | Buffer): DecodedFit {
  let bytes: Uint8Array = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (isGzip(bytes)) {
    bytes = new Uint8Array(gunzipSync(bytes));
  }

  const stream = Stream.fromByteArray(bytes);
  if (!Decoder.isFIT(stream)) {
    throw new Error("Not a valid FIT file");
  }
  const decoder = new Decoder(stream);
  const { messages, errors } = decoder.read({
    convertTypesToStrings: true,
    convertDateTimesToDates: true,
  });

  return { messages: messages as FitMessages, errors: errors ?? [], bytes };
}
