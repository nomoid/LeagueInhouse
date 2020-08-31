import { Replay } from "../src/models/Replay";
import { connectToMongoose } from "../src/util/mongoose";

async function runner() {
    return new Promise<void>((resolve, reject) => {
        console.log("Finding replays...");
        Replay.find({ storageLocation: { $ne: "azure" } }, (err, replays) => {
            if (err) {
                reject(err);
                return;
            }
            const total = replays.length;
            console.log(`Found ${total} replays.`);
            const replayPromises = new Array<Promise<void>>();
            console.log("Converting replays...");
            let index = 0;
            let complete = 0;
            for (const replay of replays) {
                index += 1;
                const i = index;
                const promise = new Promise<void>((resolve, reject) => {
                    console.log(`[${i}] Loading replay from Mongodb...`);
                    replay.loadReplay((err, buffer) => {
                        if (err) {
                            console.log(`[${i}] Error loading replay!`);
                            reject(err);
                            return;
                        }
                        if (!buffer) {
                            console.log(`[${i}] Error loading replay!`);
                            reject(new Error("Failed to load replay!"));
                            return;
                        }
                        // Save azure replay
                        replay.storageLocation = "azure";
                        console.log(`[${i}] Saving replay to Azure...`);
                        replay.saveReplay(buffer, (err) => {
                            if (err) {
                                console.log(`[${i}] Error saving replay!`);
                                reject(err);
                                return;
                            }
                            // Delete mongo replay
                            replay.storageLocation = "mongodb";
                            console.log(`[${i}] Deleting replay from Mongodb...`);
                            replay.deleteReplay((err) => {
                                if (err) {
                                    console.log(`[${i}] Error deleting replay!`);
                                    reject(err);
                                    return;
                                }
                                // Update storage location
                                replay.storageLocation = "azure";
                                console.log(`[${i}] Updating storage location...`);
                                replay.save((err) => {
                                    if (err) {
                                        console.log(`[${i}] Error updating storage location!`);
                                        reject(err);
                                        return;
                                    }
                                    complete++;
                                    console.log(`[${i}] ${complete}/${total} complete!`);
                                    resolve();
                                });
                            });
                        });
                    });
                });
                replayPromises.push(promise);
            }
            Promise.all(replayPromises).then(() => {
                resolve();
            });
        });

    });
}

async function main() {
    connectToMongoose();
    console.log("Migrating from Mongodb to Azure...");
    await runner();
    console.log("Migration complete!");
}

main();