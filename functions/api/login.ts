import Env from "../utils/Env";
import { hmacVerify } from "../utils/utils";

// Redeem a login token issued by POST /api/token.
// On success the PASSWORD session cookie is set, so the browser is
// logged in without typing the password. This route is exempted from
// the api/_middleware.ts authentication (it IS the authentication).
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { env, request } = context;
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const expire = url.searchParams.get("expire");
    if (!token || !expire || Number.isNaN(parseInt(expire))) {
        return new Response("Bad request", { status: 400 });
    }
    if (Date.now() > parseInt(expire)) {
        return new Response("Token expired", { status: 401 });
    }
    const ok = await hmacVerify(`login:${expire}`, env.PASSWORD ?? "", token);
    if (!ok) {
        return new Response("Unauthorized", { status: 401 });
    }
    const headers = new Headers({ "content-type": "application/json" });
    headers.append(
        "Set-Cookie",
        `PASSWORD=${encodeURIComponent(env.PASSWORD ?? "")}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
    );
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};
