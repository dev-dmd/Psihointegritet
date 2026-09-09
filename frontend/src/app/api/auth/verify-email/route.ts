import { getTranslations } from "next-intl/server";

import {
  readStringFields,
  refuse,
  succeed,
} from "@/lib/auth/session/auth-request";
import {
  PlatformAuthError,
  verifyEmail,
} from "@/lib/auth/session/platform-auth";

/**
 * Spend a verification link, so the account behind it may sign in.
 *
 * No session is issued and no cookie is touched. Registration already signed
 * the browser that registered in; a link opened days later, possibly on another
 * device, must not hand *that* browser a session it never authenticated for.
 *
 * A POST rather than a GET on the page, because mail clients and link scanners
 * fetch every URL in a message before anybody reads it — and a token spent by a
 * scanner is a person who can never verify.
 */
export async function POST(request: Request) {
  const t = await getTranslations("screens.platform");
  const fields = await readStringFields(request, ["token"]);
  if (!fields?.token) {
    return refuse(400, t("verifyFailed"));
  }

  try {
    await verifyEmail(fields.token, t("verifyFailed"));
  } catch (error) {
    if (error instanceof PlatformAuthError) {
      return refuse(400, error.message);
    }
    return refuse(503, t("authUnreachable"));
  }

  return succeed();
}
