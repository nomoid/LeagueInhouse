import mongoose from "mongoose";
import mongo from "mongodb";

declare module "mongoose" {
    export function Long (key: any, options: any): void;

    namespace Schema.Types {
        class Long extends mongoose.SchemaType {
            
        }
    }

    namespace Types {
        class Long extends mongo.Long {

        }
    }
}