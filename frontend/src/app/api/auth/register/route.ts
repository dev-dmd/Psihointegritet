import { getTranslations } from "next-intl/server";

import {
  readStringFields,
  refuse,
  succeed,
} from "@/lib/auth/session/auth-request";
import { PlatformAuthError, register } from "@/lib/auth/session/platform-auth";
import { setPlatformSessionCookie } from "@/lib/auth/session/session-cookie";

/**
 * Open a platform account and sign it in.
 *
 * The account is created with no membership and no operator flag, so it can
 * reach nothing: authorization is `organization_memberships`, never the mere
 * fact of having signed in. Same cookie discipline as sign-in — the token goes
 * into an `HttpOnly` cookie here and never appears in the response.
 */
export async function POST(request: Request) {
  const t = await getTranslations("screens.platform");
  const fields = await readStringFields(request, [
    "email",
    "password",
    "displayName",
  ]);
  if (!fields?.email || !fields.password) {
    return refuse(400, t("registerFailed"));
  }

  try {
    const session = await register(
      fields.email,
      fields.password,
      fields.displayName.trim() || null,
      t("registerFailed"),
    );
    const response = succeed();
    setPlatformSessionCookie(response, session);
    return response;
  } catch (error) {
    if (error instanceof PlatformAuthError) {
      return refuse(error.status === 409 ? 409 : 400, error.message);
    }
    return refuse(503, t("authUnreachable"));
  }
}
