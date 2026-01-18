import { getDb } from "@/lib/mongodb";
import { ensureRequestsCollection } from "@/server/db/initRequestsCollection";
import { PAGINATION_PAGE_SIZE } from "@/lib/constants/config";
import { ServerResponseBuilder } from "@/lib/builders/serverResponseBuilder";
import { ResponseType } from "@/lib/types/apiResponse";
import { InputException, InvalidInputError } from "@/lib/errors/inputExceptions";

function validateCreateBody(body: any) {
    if (
        !body ||
        typeof body.requestorName !== "string" ||
        body.requestorName.length < 3 ||
        body.requestorName.length > 30 ||
        typeof body.itemRequested !== "string" ||
        body.itemRequested.length < 2 ||
        body.itemRequested.length > 100
     ) {
        throw new InvalidInputError("Invalid request body");
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        validateCreateBody(body);

        await ensureRequestsCollection();
        const db = await getDb();

        const now = new Date();
        const doc = {
            requestorName: body.requestorName,
            itemRequested: body.itemRequested,
            createdDate: now,
            lastEditedDate: now,
            status: "pending" as const,
        };

        const result = await db.collection("requests").insertOne(doc);

        return new Response(
            JSON.stringify({ _id: result.insertedId, ...doc }),
            {
                status: 201,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (e) {
        if (e instanceof InputException) {
            return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
        }
        return new ServerResponseBuilder(ResponseType.UNKNOWN_ERROR).build();
    }
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1", 10);

    if (Number.isNaN(page) || page < 1) {
        return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
    }

    try {
        await ensureRequestsCollection();
        const db = await getDb();
        const collection = db.collection("requests");

        const query: Record<string, unknown> = {};
        if (status) query.status = status;

        const pageSize = PAGINATION_PAGE_SIZE;
        const skip = (page - 1) * pageSize;

        const [totalCount, docs] = await Promise.all([
            collection.countDocuments(query),
            collection
                .find(query)
                .sort({ createdDate: -1 })
                .skip(skip)
                .limit(pageSize)
                .toArray(),
        ]);

        const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

        const items = docs.map((d: any) => ({
            id: d._id.toString(),
            requestorName: d.requestorName,
            itemRequested: d.itemRequested,
            createdDate: d.createdDate,
            lastEditedDate: d.lastEditedDate,
            status: d.status,
        }));

        const responseBody = {
            items,
            pagination: {
                page,
                pageSize,
                totalPages,
                totalCount,
            },
        };

        return new Response(JSON.stringify(responseBody), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch {
        return new ServerResponseBuilder(ResponseType.UNKNOWN_ERROR).build();
    }
}