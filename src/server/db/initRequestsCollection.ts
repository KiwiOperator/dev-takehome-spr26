import { getDb } from "@/lib/mongodb";

export async function ensureRequestsCollection() {
    const db = await getDb();

    const collections = await db.listCollections({ name: "requests" }, { nameOnly: true }).toArray();

    if (collections.length > 0) return;

    await db.createCollection("requests", {
        validator: {
            $jsonSchema: {
                bsonType: "object",
                required: ["requestorName", "itemRequested", "createdDate", "status"],
                additionalProperties: false,
                properties: {
                    _id: {},
                    requestorName: {
                        bsonType: "string",
                        minLength: 3,
                        maxLength: 30,
                    },
                    itemRequested: {
                        bsonType: "string",
                        minLength: 2,
                        maxLength: 100,
                    },
                    createdDate: {
                        bsonType: "date",
                    },
                    lastEditedDate: {
                        bsonType: "date",
                    },
                    status: {
                        bsonType: "string",
                        enum: ["pending", "completed", "approved", "rejected"],
                    },
                },
            },
        },
    });
}