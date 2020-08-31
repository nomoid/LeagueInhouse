import mongoose from "mongoose";
import mongooseLong from "mongoose-long";
import { createModel } from "mongoose-gridfs";
import { Readable } from "stream";
import { STORAGE_LOCATION } from "../util/secrets";
import { AZURE_STORAGE_CONNECTION_STRING } from "../util/secrets";
import { BlobServiceClient } from "@azure/storage-blob";

mongooseLong(mongoose);

const schemaTypes = mongoose.Schema.Types;

type LoadReplayCallback = (error?: Error, data?: Buffer) => unknown;
type SaveReplayCallback = (error?: Error, storageLocation?: "mongodb" | "azure") => unknown;

export type ReplayDocument = mongoose.Document & {
    matchId: mongoose.Types.Long;
    mode: string;
    date: string;
    submitter: string;
    incomplete: boolean;
    storageLocation: string;
    draft?: {
        blueFirstPick: boolean;
        blueDraft: number[];
        redDraft: number[];
    };
    loadReplay: (next: LoadReplayCallback) => void;
    saveReplay: (data: Buffer, next: SaveReplayCallback) => void;
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
    }
}, { timestamps: true });

async function saveReplayAzure(buffer: Buffer, fileName: string, connectionString: string) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient("replays");
    await containerClient.createIfNotExists();
    
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    await blockBlobClient.upload(buffer.buffer, buffer.length);
}

async function loadReplayAzure(fileName: string, connectionString: string) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient("replays");
    await containerClient.createIfNotExists();
    
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    if (!blockBlobClient.exists()) {
        return;
    }

    return blockBlobClient.downloadToBuffer(0);
}

function saveReplay(replay: ReplayDocument, buffer: Buffer, next: SaveReplayCallback) {
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

function loadReplay(replay: ReplayDocument, next: LoadReplayCallback) {
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

replaySchema.methods.saveReplay = function (this: ReplayDocument, data: Buffer, next: SaveReplayCallback) {
    saveReplay(this, data, next);
};

replaySchema.methods.loadReplay = function (this: ReplayDocument, next: LoadReplayCallback) {
    loadReplay(this, next);
};

export const Replay = mongoose.model<ReplayDocument>("Replay", replaySchema);

export function longFromBigInt(n: bigint) {
    return mongoose.Types.Long.fromString(n.toString());
}