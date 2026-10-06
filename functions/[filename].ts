import { GetObjectCommand, CopyObjectCommand, DeleteObjectCommand, GetObjectCommandOutput, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import mime from 'mime/lite';

import Env from './utils/Env';
import { createS3Client, auth } from './utils/utils';

/**
 * The frontend URL-encodes the storage key (see src/api/file.ts).
 * Pages may or may not have decoded it already, so decode defensively:
 * a plain name without % sequences passes through unchanged, and a
 * stray % never throws.
 */
const decodeFilename = (raw: string): string => {
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { params, env } = context;
    const filename = decodeFilename(params.filename as string);
    const { BUCKET } = env;
    const s3 = createS3Client(env);
    const command = new GetObjectCommand({
        Bucket: BUCKET!,
        Key: filename as string
    });
    let response: GetObjectCommandOutput;
    try {
        response = await s3.send(command);
    } catch (e) {
        return new Response("Not found", { status: 404 });
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(response.Metadata)) {
        headers.set(key, value);
    }
    if (response.ContentType !== "application/octet-stream") {
        headers.set('content-type', response.ContentType);
    } else {
        headers.set('content-type', mime.getType(filename as string) || "application/octet-stream");
    }
    if (response.Metadata['x-store-type'] === "text") {
        headers.set('content-type', 'text/plain;charset=utf-8');
    }
    headers.set('content-length', response.ContentLength.toString());
    headers.set('last-modified', response.LastModified.toUTCString());

    headers.set('etag', response.ETag);

    if (headers.get("x-store-visibility") !== "public" && !(await auth(env, context.request))) {
        return new Response("Not found", { status: 404 });
    }
    return new Response(
        response.Body.transformToWebStream(),
        {
            headers,
        }
    );
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
    const { params, env, request } = context;
    if (!(await auth(env, request))) {
        return new Response("Unauthorized", { status: 401 });
    }
    const filename = decodeFilename(params.filename as string);
    const { BUCKET } = env;
    const s3 = createS3Client(env);
    const headers = new Headers(request.headers);
    const x_store_headers = [];
    for (const [key, value] of headers.entries()) {
        if (key.startsWith('x-store-')) {
            x_store_headers.push([key, value]);
        }
    }
    const parallelUploads3 = new Upload({
        client: s3,
        params: { Bucket: BUCKET, Key: filename as string, Body: request.body, Metadata: Object.fromEntries(x_store_headers) },
        queueSize: 4, // optional concurrency configuration
        partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
        leavePartsOnError: false, // optional manually handle dropped parts
    });
    await parallelUploads3.done();
    return new Response("OK", { status: 200 });
}

export const onRequestPatch: PagesFunction<Env> = async (context) => {
    // TEMPORARY DIAGNOSTIC - will be replaced after root cause is found
    const { params, env, request } = context;
    if (!(await auth(env, request))) {
        return new Response("Unauthorized", { status: 401 });
    }
    const filename = decodeFilename(params.filename as string);
    const raw = params.filename as string;
    const { BUCKET } = env;
    const s3 = createS3Client(env);
    const tryHead = async (key: string): Promise<string> => {
        try {
            await s3.send(new HeadObjectCommand({ Bucket: BUCKET!, Key: key }));
            return "200";
        } catch (e: any) {
            return `${e?.$metadata?.httpStatusCode ?? "?"}:${e?.name ?? "?"}`;
        }
    };
    const tryGet = async (key: string): Promise<string> => {
        try {
            const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET!, Key: key, Range: "bytes=0-0" }));
            try { await (r.Body as any)?.cancel(); } catch {}
            return "200";
        } catch (e: any) {
            return `${e?.$metadata?.httpStatusCode ?? "?"}:${e?.name ?? "?"}`;
        }
    };
    const vDecoded = filename;
    const vRaw = raw;
    const vPlus = filename.replace(/ /g, "+");
    const vNbsp = filename.replace(/ /g, "\u00a0");
    const report = [
        `decodedHead=${await tryHead(vDecoded)}`,
        `decodedGet=${await tryGet(vDecoded)}`,
        `rawHead=${await tryHead(vRaw)}`,
        `plusHead=${await tryHead(vPlus)}`,
        `nbspHead=${await tryHead(vNbsp)}`,
    ].join(" ");
    return new Response(`DIAG2 ${report} key="${vDecoded}"`, { status: 404 });
};

export const onRequestHead: PagesFunction<Env> = async (context) => {
    const { params, env, request } = context;
    if (!(await auth(env, request))) {
        return new Response("Unauthorized", { status: 401 });
    }
    const filename = decodeFilename(params.filename as string);
    const { BUCKET } = env;
    const s3 = createS3Client(env);
    try {
        const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET!, Key: filename }));
        const headers = new Headers();
        if (head.Metadata?.['x-store-visibility']) {
            headers.set('x-store-visibility', head.Metadata['x-store-visibility']);
        }
        if (head.ContentLength !== undefined) {
            headers.set('content-length', String(head.ContentLength));
        }
        return new Response(null, { status: 200, headers });
    } catch {
        return new Response("Not found", { status: 404 });
    }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const { params, env, request } = context;
    if (!(await auth(env, request))) {
        return new Response("Unauthorized", { status: 401 });
    }
    const filename = decodeFilename(params.filename as string);
    const { BUCKET } = env;
    const s3 = createS3Client(env);
    const command = new DeleteObjectCommand({
        Bucket: BUCKET!,
        Key: filename as string
    });
    const url = await getSignedUrl(
        s3,
        command,
        { expiresIn: 3600 }
    );
    await fetch(url, {
        method: 'DELETE',
    });
    return new Response("OK", { status: 200 });
}

export const onRequest: PagesFunction<Env> = async () => {
    return new Response("Method not allowed", { status: 405 });
};