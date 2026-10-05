import Env from "../utils/Env";
import { auth } from "../utils/utils";

const errorHandling: PagesFunction<Env> = async (context) => {
  try {
    return await context.next();
  } catch (err) {
    return new Response(`${err.message}\n${err.stack}`, { status: 500 });
  }
}

const authentication: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  // Token redemption must work without an existing session —
  // it IS the login, so it is exempt from authentication here.
  if (new URL(request.url).pathname === "/api/login") {
    return await context.next();
  }
  if (!(await auth(env, request))) {
    return new Response("Unauthorized", { status: 401 });
  }
  return await context.next();
}

export const onRequest = [errorHandling, authentication];