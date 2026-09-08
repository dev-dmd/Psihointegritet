import { getTranslations } from "next-intl/server";

import {
  readStringFields,
  refuse,
  succeed,
} from "@/lib/auth/session/auth-request";
import {
  PlatformAuthError,
  resetPassword,
} from "@/lib/auth/session/platform-auth";
import { clearSessionCookies } from "@/lib/auth/session/session-cookie";

/**
 * Spend a reset link and set a new password.
 *
 * No session is issued. Whoever completes a reset signs in afterwards with the
 * password they just chose — the safer order, because the backend revokes
 * *every* session of the account as part of the reset, and handing one straight
 * back would make an exception for the one request that asked, which is
 * precisely the request an attacker would be making.
 *
 * The cookies are cleared for the same reason: this browser's old session is
 * among the ones the backend just revoked.
 */
export async function POST(request: Request) {
  const t = await getTranslations("screens.platform");
  const fields = await readStringFields(request, ["token", "password"]);
  if (!fields?.token || !fields.password) {
    return refuse(400, t("resetFailed"));
  }

  try {
    await resetPassword(fields.token, fields.password, t("resetFailed"));
  } catch (error) {
    if (error instanceof PlatformAuthError) {
      return refuse(error.status === 422 ? 422 : 400, error.message);
    }
    return refuse(503, t("authUnreachable"));
  }

  const response = succeed();
  clearSessionCookies(response);
  return response;
}
