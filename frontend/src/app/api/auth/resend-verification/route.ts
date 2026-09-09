import { getTranslations } from "next-intl/server";

import {
  readStringFields,
  refuse,
  succeed,
} from "@/lib/auth/session/auth-request";
import { resendVerification } from "@/lib/auth/session/platform-auth";

/**
 * Ask for a fresh verification link.
 *
 * **Answers the same thing no matter what is found**, with one more case folded
 * in than its sibling: an address that is *already* verified is answered
 * identically, so this cannot be used to sort addresses into verified and not.
 * An account, no account, already verified, inside the cooldown — one response.
 *
 * Only a backend that could not be reached is reported differently, and that is
 * not a disclosure: it is true regardless of which address was typed.
 */
export async function POST(request: Request) {
  const t = await getTranslations("screens.platform");
  const fields = await readStringFields(request, ["email"]);
  if (!fields?.email) {
    return refuse(400, t("recoveryAddressMissing"));
  }

  try {
    await resendVerification(fields.email);
  } catch {
    return refuse(503, t("authUnreachable"));
  }
  return succeed();
}
