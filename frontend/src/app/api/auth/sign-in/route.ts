import { getTranslations } from "next-intl/server";

import {
  readStringFields,
  refuse,
  succeed,
} from "@/lib/auth/session/auth-request";
import { PlatformAuthError, signIn } from "@/lib/auth/session/platform-auth";
import { setPlatformSessionCookie } from "@/lib/auth/session/session-cookie";

/**
 * Sign in, and put the session where a script cannot reach it.
 *
 * The backend returns the opaque token to *this* handler; the handler writes it
 * into an `HttpOnly` cookie and answers the browser `{ ok: true }`. The token is
 * never part of a response body. Adding it "for convenience" would undo the one
 * property this design exists for, so the success shape is deliberately too
 * small to carry it.
 *
 * The refusal message comes from the backend, which already applies one generic
 * sentence to every cause — wrong password, unknown address, throttled account.
 * Nothing here distinguishes them either.
 */
export async function POST(request: Request) {
  const t = await getTranslations("screens.platform");
  const fields = await readStringFields(request, ["email", "password"]);
  if (!fields?.email || !fields.password) {
    return refuse(400, t("signInFailed"));
  }

  try {
    const session = await signIn(
      fields.email,
      fields.password,
      t("signInFailed"),
    );
    const response = succeed();
    setPlatformSessionCookie(response, session);
    return response;
  } catch (error) {
    if (error instanceof PlatformAuthError) {
      return refuse(error.status === 401 ? 401 : 400, error.message);
    }
    // The backend is unreachable, not the password wrong. Saying so keeps
    // somebody from resetting a password that was never the problem.
    return refuse(503, t("authUnreachable"));
  }
}
