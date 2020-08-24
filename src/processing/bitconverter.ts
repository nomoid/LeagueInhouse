// note that this returns a bigint rather than an int
export function toInt64(buf: Buffer, offset: number) {
    // TODO validation?
    const intBuf = new Uint8Array(buf.slice(offset, offset + 8)).buffer;
    return new BigUint64Array(intBuf)[0];
}

export function toInt32(buf: Buffer, offset: number) {
    const intBuf = new Uint8Array(buf.slice(offset, offset + 4)).buffer;
    return new Uint32Array(intBuf)[0];
}

export function toInt16(buf: Buffer, offset: number) {
    const intBuf = new Uint8Array(buf.slice(offset, offset + 2)).buffer;
    return new Uint16Array(intBuf)[0];
}

export function toString(buf: Buffer, offset: number, length?: number) {
    let end: number | undefined;
    if (length !== undefined) {
        end = offset + length;
    }
    const stringBuf = buf.slice(offset, end);
    return stringBuf.toString("utf8");
}