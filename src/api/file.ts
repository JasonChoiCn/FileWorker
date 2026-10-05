import axios from 'axios';

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Build the storage key for an upload in the form
 *   YYYY-MM-DD-HH-mm-ss-originalname
 * e.g. 2026-10-05-10-35-22-报告.pdf
 *
 * Path separators are stripped so the key stays a single URL path segment.
 */
const buildStorageKey = (filename: string): string => {
    const d = new Date();
    const stamp = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
        `-${pad2(d.getHours())}-${pad2(d.getMinutes())}-${pad2(d.getSeconds())}`;
    const safeName = (filename || 'file').replace(/[\\/]/g, '_').trim() || 'file';
    return `${stamp}-${safeName}`;
};

/** URL-encode a storage key for use as a single path segment. */
const encodeKey = (key: string): string => encodeURIComponent(key);

const PutFile = async (filename: string, file: File | string, visibility: string, type: string = "file"): Promise<string> => {
    const key = buildStorageKey(filename);
    const url = `/${encodeKey(key)}`;
    const headers = {
        'x-store-visibility': visibility,
        'x-store-type': type,
    };
    await axios.put(url, file, { headers });
    return key;
}

const PatchFile = async (filename: string, visibility?: string) => {
    const url = `/${encodeKey(filename)}`;
    const headers: { [key: string]: any } = {};
    if (visibility) {
        headers['x-store-visibility'] = visibility;
    }
    const response = await axios.patch(url, {}, { headers });
    return response.data;
}

const DeleteFile = async (filename: string) => {
    const url = `/${encodeKey(filename)}`;
    const response = await axios.delete(url);
    return response.data;
}

/** Read the x-store-visibility metadata of an uploaded file. */
const GetFileVisibility = async (filename: string): Promise<string> => {
    const url = `/${encodeKey(filename)}`;
    const response = await axios.head(url);
    return (response.headers['x-store-visibility'] as string) || '';
}

export { PutFile, PatchFile, DeleteFile, GetFileVisibility, buildStorageKey, encodeKey }
