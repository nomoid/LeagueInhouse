import mongoose from "mongoose";
import mongooseLong from "mongoose-long";
import { createModel } from "mongoose-gridfs";
import { Readable } from "stream";
import { HookNextFunction } from "mongoose";

mongooseLong(mongoose);

const schemaTypes = mongoose.Schema.Types;

export type ReplayDocument = mongoose.Document & {
    matchId: mongoose.Types.Long;
    mode: string;
    date: string;
    loadReplay: (next: (error?: Error, data?: Buffer) => any) => void;
    saveReplay: (data: Buffer, next: HookNextFunction) => void;
};

const replaySchema = new mongoose.Schema({
    matchId: { type: schemaTypes.Long, unique: true },
    mode: String,
    date: String,
}, { timestamps: true });

function saveReplay(replay: ReplayDocument, buffer: Buffer, next: HookNextFunction) {
    const Attachment = createModel();
    const matchIdString = replay.matchId.toString();
    const fileName = `${matchIdString}.rofl`;
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    const options = {
        filename: fileName,
        contentType: "application/octet-stream"
    };
    Attachment.write(options, stream, (error, file) => {
        if (error) {
            return next(error);
        }
        else {
            return next();
        }
    });
}

function loadReplay(replay: ReplayDocument, next: (error?: Error, data?: Buffer) => any) {
    const Attachment = createModel();
    const matchIdString = replay.matchId.toString();
    const fileName = `${matchIdString}.rofl`;
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

replaySchema.methods.saveReplay = function(this: ReplayDocument, data: Buffer, next: HookNextFunction) {
    saveReplay(this, data, next);
};

replaySchema.methods.loadReplay = function(this: ReplayDocument, next: (error?: Error, data?: Buffer) => any) {
    loadReplay(this, next);
};

export const Replay = mongoose.model<ReplayDocument>("Replay", replaySchema);

export function longFromBigInt(n: bigint) {
    return mongoose.Types.Long.fromString(n.toString());
}