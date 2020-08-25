// ROFL parsing
// Code based on https://github.com/leeanchu/ROFL-Player/blob/master/Rofl.Reader/Parsers/RoflParser.cs

import * as BitConverter from "./bitconverter";
import * as Data from "./data";

const magicNumbers = Buffer.from([0x52, 0x49, 0x4F, 0x54]);
const lengthFieldOffset = 262;
const lengthFieldByteSize = 26;

// Throws exception if format is incorrect
async function checkFile(buf: Buffer) {
    // Check magic numbers
    const magicBuffer = buf.slice(0, 4);
    return magicNumbers.equals(magicBuffer);
}

async function extractLengthFields(buf: Buffer) {
    const lengthBuffer = buf.slice(lengthFieldOffset, lengthFieldOffset + lengthFieldByteSize);
    const lengthFields = {
        headerLength: BitConverter.toInt16(lengthBuffer, 0),
        fileLength: BitConverter.toInt32(lengthBuffer, 2),
        metadataOffset: BitConverter.toInt32(lengthBuffer, 6),
        metadataLength: BitConverter.toInt32(lengthBuffer, 10),
        payloadHeaderOffset: BitConverter.toInt32(lengthBuffer, 14),
        payloadHeaderLength: BitConverter.toInt32(lengthBuffer, 18),
        payloadOffset: BitConverter.toInt32(lengthBuffer, 22)
    };
    return lengthFields;
}

async function extractMatchMetadata(lengthFields: Data.LengthFields, buf: Buffer) {
    const metadataBuffer = buf.slice(lengthFields.metadataOffset, lengthFields.metadataOffset + lengthFields.metadataLength);
    const jsonString = BitConverter.toString(metadataBuffer, 0);
    const jsonObject = JSON.parse(jsonString);
    const blueTeam = new Array<Data.Properties>();
    const redTeam = new Array<Data.Properties>();
    const playerStats = jsonObject.statsJson.replace("\\", "");
    for (const player of JSON.parse(playerStats)) {
        if (player.TEAM.toString() === "100") {
            blueTeam.push(player);
        }
        else if (player.TEAM.toString() === "200") {
            redTeam.push(player);
        }
    }
    const metadata = {
        matchId: 0,
        gameDuration: jsonObject.gameLength,
        gameVersion: jsonObject.gameVersion,
        lastGameChunkId: jsonObject.lastGameChunkId,
        lastKeyfromId: jsonObject.lastKeyFrameId,

        bluePlayers: blueTeam,
        redPlayers: redTeam
    };
    return metadata;
}

async function extractPayloadFields(lengthFields: Data.LengthFields, buf: Buffer) {
    const payloadBuffer = buf.slice(lengthFields.payloadHeaderOffset, lengthFields.payloadHeaderOffset + lengthFields.payloadHeaderLength);
    const encryptionKeyLength = BitConverter.toInt16(payloadBuffer, 32);
    const payloadFields = {
        matchId: BitConverter.toInt64(payloadBuffer, 0),
        matchLength: BitConverter.toInt32(payloadBuffer, 8),
        keyFrameAmount: BitConverter.toInt32(payloadBuffer, 12),
        chunkAmount: BitConverter.toInt32(payloadBuffer, 16),
        endChunkId: BitConverter.toInt32(payloadBuffer, 20),
        startChunkId: BitConverter.toInt32(payloadBuffer, 24),
        keyFrameInterval: BitConverter.toInt32(payloadBuffer, 28),
        encryptionKeyLength: encryptionKeyLength,
        encryptionKey: BitConverter.toString(payloadBuffer, 34, encryptionKeyLength)
    };
    return payloadFields;
}

async function extractHeaders(buf: Buffer) {
    const lengthFields = await extractLengthFields(buf);
    const partialMatchMetadata = await extractMatchMetadata(lengthFields, buf);
    const payloadFields = await extractPayloadFields(lengthFields, buf);
    const matchId = payloadFields.matchId;
    const matchMetadata = {...partialMatchMetadata, matchId};
    return matchMetadata;
}


export async function parse(buf: Buffer): Promise<Data.Metadata> {
    if (!await checkFile(buf)) {
        throw new Error("Invalid magic number!");
    }
    return await extractHeaders(buf);
}
