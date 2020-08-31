import mongoose from "mongoose";
import mongo from "mongodb";
import { Readable } from "nodemailer/lib/xoauth2";

declare module "mongoose-gridfs" {
    interface CreateModelOptions {
        connection: mongoose.Connection;
        modelName: string;
        bucketName: string;
        chunkSizeBytes: number;
        writeConcern: any;
        readPreference: any;

    }

    type DoneCallback = (error: any, result: any) => void;

    class GridFSBucket {
        createWriteStream(options: any): mongo.GridFSBucketWriteStream;
        createReadStream(options: any): mongo.GridFSBucketReadStream;
        writeFile(file: any, readstream: Readable, done?: DoneCallback): mongo.GridFSBucketWriteStream;
        readFile(options: any, done?: DoneCallback): mongo.GridFSBucketReadStream; 
        deleteFile(id: mongo.ObjectID, done: DoneCallback): void;
        findOne(options: any, done: DoneCallback): any;
        findById(id: mongo.ObjectID, done: DoneCallback): void;
    }

    interface FileSchema extends mongoose.Model<mongoose.Document, {}> {
        write(file: any, readstream: Readable, done?: DoneCallback): mongo.GridFSBucketWriteStream;
        read(options: any, done?: DoneCallback): mongo.GridFSBucketReadStream; 
        unlink(id: mongo.ObjectID, done: DoneCallback): void;
    }

    export function createModel(options?: Partial<CreateModelOptions>): FileSchema;
    export function createBucket(options?: any): GridFSBucket;
}