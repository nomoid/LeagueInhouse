// simplified replay parsing functionality
async function getReplayId(file: File) {
    const check = await checkFile(file);
    if (!check) {
        return undefined;
    }
    // get the length fields
    const lengthFields = await extractLengthFields(file);
    const payloadBuffer = file.slice(lengthFields.payloadHeaderOffset, lengthFields.payloadHeaderOffset + lengthFields.payloadHeaderLength);
    const matchId = await toInt64(payloadBuffer, 0);
    return matchId.toString();
}

const magicNumbers = [0x52, 0x49, 0x4F, 0x54];

async function checkFile(buf: Blob) {
    // Check magic numbers
    const magicBuffer = buf.slice(0, 4);
    const arrayBuffer = await magicBuffer.arrayBuffer();
    const magicArray = new Uint8Array(arrayBuffer);
    let i = 0;
    for (const val of magicArray) {
        if (val != magicNumbers[i]) {
            return false;
        }
        i++;
    }

    return true;
}

async function extractLengthFields(buf: File) {
    const lengthFieldOffset = 262;
    const lengthFieldByteSize = 26;
    const lengthBuffer = buf.slice(lengthFieldOffset, lengthFieldOffset + lengthFieldByteSize);
    const lengthFields = {
        headerLength: await toInt16(lengthBuffer, 0),
        fileLength: await toInt32(lengthBuffer, 2),
        metadataOffset: await toInt32(lengthBuffer, 6),
        metadataLength: await toInt32(lengthBuffer, 10),
        payloadHeaderOffset: await toInt32(lengthBuffer, 14),
        payloadHeaderLength: await toInt32(lengthBuffer, 18),
        payloadOffset: await toInt32(lengthBuffer, 22)
    };
    return lengthFields;
}

async function toInt64(buf: Blob, offset: number) {
    // TODO validation?
    const abuf = await buf.slice(offset, offset + 8).arrayBuffer();
    const intBuf = new Uint8Array(abuf).buffer;
    return new BigUint64Array(intBuf)[0];
}

async function toInt32(buf: Blob, offset: number) {
    const abuf = await buf.slice(offset, offset + 4).arrayBuffer();
    const intBuf = new Uint8Array(abuf).buffer;
    return new Uint32Array(intBuf)[0];
}

async function toInt16(buf: Blob, offset: number) {
    const abuf = await buf.slice(offset, offset + 2).arrayBuffer();
    const intBuf = new Uint8Array(abuf).buffer;
    return new Uint16Array(intBuf)[0];
}

function toString(buf: Buffer, offset: number, length?: number) {
    let end: number | undefined;
    if (length !== undefined) {
        end = offset + length;
    }
    const stringBuf = buf.slice(offset, end);
    return stringBuf.toString("utf8");
}

async function checkRecentReplay(element: HTMLInputElement) {
    const recentReplayElement = document.getElementById("recent-replays");
    if (!recentReplayElement) {
        return;
    }
    const recents = JSON.parse(recentReplayElement.innerHTML);
    const files = element.files;
    if (files && files.length > 0) {
        const replayId = await getReplayId(files[0]);
        if (replayId === undefined) {
            element.setCustomValidity("Invalid replay file format!");
            const uploadErrorElement = document.getElementById("upload-error");
            if (uploadErrorElement) {
                const uploadErrorTextElement = document.getElementById("upload-error-text") as HTMLElement;
                uploadErrorTextElement.innerHTML = "This replay has an invalid file format! Please select another replay.";
                uploadErrorElement.style.display = "flex";
            }
            return;
        }
        if (recents.includes(replayId)) {
            element.setCustomValidity("This replay has already been uploaded recently!");
            const uploadErrorElement = document.getElementById("upload-error");
            if (uploadErrorElement) {
                const uploadErrorTextElement = document.getElementById("upload-error-text") as HTMLElement;
                uploadErrorTextElement.innerHTML = "This replay has already been uploaded recently! Please select another replay.";
                uploadErrorElement.style.display = "flex";
            }
            return;
        }
    }
    element.setCustomValidity("");
    const uploadErrorElement = document.getElementById("upload-error");
    if (uploadErrorElement) {
        uploadErrorElement.style.display = "none";
    }
}