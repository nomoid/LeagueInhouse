export interface Properties {
    [key: string ]: string;
}

export interface Metadata {
    matchId: bigint;
    gameDuration: number;
    gameVersion: string;
    lastGameChunkId: number;
    lastKeyfromId: number;

    bluePlayers: Array<Properties>;
    redPlayers: Array<Properties>;
}

export interface LengthFields {
    headerLength: number;
    fileLength: number;
    metadataOffset: number;
    metadataLength: number;
    payloadHeaderOffset: number;
    payloadHeaderLength: number;
    payloadOffset: number;
}

export interface PayloadFields {
    matchId: bigint;
    matchLength: number;
    keyFrameAmount: number;
    chunkAmount: number;
    endChunkId: number;
    startChunkId: number;
    keyFrameInterval: number;
    encryptionKeyLength: number;
    encryptionKey: string;
}