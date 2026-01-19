import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri)  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
if (!dbName) throw new Error("Please define the MONGODB_DB environment variable in .env.local");

declare global {
    // eslint-disable-next-line no-var
    var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
}

const clientPromise: Promise<MongoClient> = 
    global._mongoClientPromise ??
    (global._mongoClientPromise = new MongoClient(uri).connect());

export async function getDb(): Promise<Db> {
    const client = await clientPromise;
    return client.db(dbName);
}

export default clientPromise;