import Env from "../utils/Env";
import { sign } from "../utils/utils";

// Mint a password-free login token. Requires an existing session
// (the api/_middleware.ts authentication runs before this).
// The token is an HMAC of "login:<expire>" keyed with PASSWORD,
// valid for 30 days. Changing PASSWORD invalidates all issued tokens.
const TOKEN_TTL_MS = 30 * 24 * 3600 * 1000;

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { env } = context;
    const expire = Date.now() + TOKEN_TTL_MS;
    const token = await sign(`login:${expire}`, env.PASSWORD ?? "");
    return Response.json({ token, expire });
};
