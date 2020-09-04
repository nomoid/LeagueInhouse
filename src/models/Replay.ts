import mongoose from "mongoose";
import mongooseLong from "mongoose-long";
import { createModel } from "mongoose-gridfs";
import { Readable } from "stream";
import { STORAGE_LOCATION } from "../util/secrets";
import { AZURE_STORAGE_CONNECTION_STRING } from "../util/secrets";
import { BlobServiceClient } from "@azure/storage-blob";
import { Metadata } from "../processing/data";
import { parse } from "../processing/parser";
import { extractAllPlayers, Player } from "../processing/player";

mongooseLong(mongoose);

const schemaTypes = mongoose.Schema.Types;

type LoadMetadataCallback = (error?: Error, metadata?: Metadata) => unknown;
type LoadReplayCallback = (error?: Error, data?: Buffer) => unknown;
type SaveReplayCallback = (error?: Error, storageLocation?: "mongodb" | "azure") => unknown;
type DeleteReplayCallback = (error?: Error) => unknown;

export type ReplayDocument = mongoose.Document & {
    matchId: mongoose.Types.Long;
    mode: string;
    date: string;
    submitter: string;
    incomplete: boolean;
    storageLocation: "mongodb" | "azure";
    draft?: {
        blueFirstPick: boolean;
        blueDraft: number[];
        redDraft: number[];
    };
    // JSON string of Metadata object
    metadata?: string;
    loadMetadata: (next: LoadMetadataCallback, skipSave?: boolean) => void;
    loadReplay: (next: LoadReplayCallback) => void;
    saveReplay: (data: Buffer, next: SaveReplayCallback) => void;
    deleteReplay: (next: DeleteReplayCallback) => void;
};

const replaySchema = new mongoose.Schema({
    matchId: { type: schemaTypes.Long, unique: true, required: true },
    mode: String,
    date: { type: String, required: true },
    submitter: { type: String, required: true },
    incomplete: Boolean,
    storageLocation: { type: String },
    draft: {
        blueFirstPick: Boolean,
        blueDraft: [Number],
        redDraft: [Number]
    },
    metadata: String
}, { timestamps: true });

export async function saveReplayAzure(buffer: Buffer, fileName: string, connectionString: string) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient("replays");
    await containerClient.createIfNotExists();

    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    await blockBlobClient.upload(buffer.buffer, buffer.length);
}

export async function loadReplayAzure(fileName: string, connectionString: string) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient("replays");
    await containerClient.createIfNotExists();

    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    if (!blockBlobClient.exists()) {
        return;
    }

    return blockBlobClient.downloadToBuffer(0);
}

export async function deleteReplayAzure(fileName: string, connectionString: string) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient("replays");
    if (!containerClient.exists()) {
        return false;
    }

    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    if (!blockBlobClient.exists()) {
        return false;
    }

    await blockBlobClient.delete();
    return true;
}

export function saveReplay(replay: ReplayDocument, buffer: Buffer, next: SaveReplayCallback) {
    const Attachment = createModel();
    const matchIdString = replay.matchId.toString();
    const fileName = `${matchIdString}.rofl`;
    if (STORAGE_LOCATION === "azure" && AZURE_STORAGE_CONNECTION_STRING) {
        saveReplayAzure(buffer, fileName, AZURE_STORAGE_CONNECTION_STRING).then(() => {
            return next(undefined, "azure");
        });
    }
    else {
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);
        const options = {
            filename: fileName,
            contentType: "application/octet-stream"
        };
        Attachment.write(options, stream, (error) => {
            if (error) {
                return next(error);
            }
            else {
                return next(undefined, "mongodb");
            }
        });
    }
}

export function loadReplay(replay: ReplayDocument, next: LoadReplayCallback) {
    const Attachment = createModel();
    const matchIdString = replay.matchId.toString();
    const fileName = `${matchIdString}.rofl`;
    if (replay.storageLocation === "azure") {
        if (!AZURE_STORAGE_CONNECTION_STRING) {
            return next(new Error("No Azure connection string for Azure replay"));
        }
        loadReplayAzure(fileName, AZURE_STORAGE_CONNECTION_STRING).then((buffer) => {
            if (!buffer) {
                return next(new Error("Failed to fetch Azure replay"));
            }
            return next(undefined, buffer);
        });
    }
    else {
        const options = {
            filename: fileName,
        };
        Attachment.read(options, (error, buffer) => {
            if (error) {
                return next(error);
            }
            else {
                return next(undefined, buffer);
            }
        });
    }
}

export function deleteReplay(replay: ReplayDocument, next: DeleteReplayCallback) {
    const Attachment = createModel();
    const matchIdString = replay.matchId.toString();
    const fileName = `${matchIdString}.rofl`;
    if (replay.storageLocation === "azure") {
        if (!AZURE_STORAGE_CONNECTION_STRING) {
            return next(new Error("No Azure connection string for Azure replay"));
        }
        deleteReplayAzure(fileName, AZURE_STORAGE_CONNECTION_STRING).then(() => {
            return next(undefined);
        });
    }
    else {
        const options = {
            filename: fileName,
        };
        Attachment.findOne(options, (error, res) => {
            if (error) {
                return next(error);
            }
            if (!res) {
                return next(new Error("Replay file not found!"));
            }
            Attachment.unlink(res._id, (error) => {
                if (error) {
                    return next(error);
                }
                else {
                    return next(undefined);
                }
            });
        });
    }
}

export function stringifyMetadata(metadata: Metadata) {
    return JSON.stringify(metadata, (_, value) => {
        return typeof value === "bigint" ? value.toString() : value;
    });
}

export function loadMetadata(replay: ReplayDocument, next: LoadMetadataCallback, skipSave?: boolean) {
    if (replay.metadata) {
        return next(undefined, JSON.parse(replay.metadata) as Metadata);
    }
    loadReplay(replay, (error, buffer) => {
        if (error) {
            return next(error);
        }
        parse(buffer as Buffer).then((metadata) => {
            replay.metadata = stringifyMetadata(metadata);
            if (skipSave) {
                return next(undefined, metadata);
            }
            else {
                replay.save((err) => {
                    if (err) {
                        return next(err);
                    }
                    return next(undefined, metadata);
                });
            }
        });
    });
}

replaySchema.methods.saveReplay = function (this: ReplayDocument, data: Buffer, next: SaveReplayCallback) {
    saveReplay(this, data, next);
};

replaySchema.methods.loadReplay = function (this: ReplayDocument, next: LoadReplayCallback) {
    loadReplay(this, next);
};

replaySchema.methods.deleteReplay = function (this: ReplayDocument, next: DeleteReplayCallback) {
    deleteReplay(this, next);
};

replaySchema.methods.loadMetadata = function (this: ReplayDocument, next: LoadMetadataCallback, skipSave?: boolean) {
    loadMetadata(this, next, skipSave);
};

export const Replay = mongoose.model<ReplayDocument>("Replay", replaySchema);

export async function playerFunction<T>(replay: ReplayDocument, playerCallback: (player: Player) => Promise<T>) {
    const promises: Array<Promise<T>> = [];
    await new Promise<void>((resolve, reject) => {
        replay.loadMetadata((err, result) => {
            if (err) {
                reject(err);
                return;
            }
            const metadata = extractAllPlayers(result as Metadata);
            for (const players of [metadata.blue, metadata.red]) {
                for (const player of players) {
                    promises.push(playerCallback(player));
                }
            }
            resolve();
        }, true);
    });
    return Promise.all(promises);
}

export async function allSummoners(replay: ReplayDocument) {
    return playerFunction<string>(replay, async (player) => {
        return player.summonerName;
    });
}

export function longFromBigInt(n: bigint) {
    return mongoose.Types.Long.fromString(n.toString());
}

export function recentReplays(numReplays: number) {
    return new Promise<ReplayDocument[]>((resolve, reject) => {
        Replay.find().limit(numReplays).sort({ $natural: -1 }).exec((err, replays) => {
            if (err) {
                return reject(err);
            }
            else {
                return resolve(replays);
            }
        });
    });
}