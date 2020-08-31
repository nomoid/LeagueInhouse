import { MONGODB_URI } from "./secrets";
import Bluebird from "bluebird";
import mongoose from "mongoose";

// Connect to MongoDB
export function connectToMongoose() {
    const mongoUrl = MONGODB_URI;
    mongoose.Promise = Bluebird;

    if (mongoUrl === undefined) {
        console.log("MongoURL undefined!");
        process.exit();
    }

    mongoose.connect(mongoUrl, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true }).then(
        () => { /** ready to use. The `mongoose.connect()` promise resolves to undefined. */ },
    ).catch(err => {
        console.log(`MongoDB connection error. Please make sure MongoDB is running. ${err}`);
        process.exit();
    });

    return mongoUrl;
}