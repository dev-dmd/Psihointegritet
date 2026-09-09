import { getTranslations } from "next-intl/server";

import {
  readStringFields,
  refuse,
  succeed,
} from "@/lib/auth/session/auth-request";
import { requestPasswordReset } from "@/lib/auth/session/platform-auth";

/**
 * Ask for a password-reset link.
 *
 * **Answers the same thing no matter what is found.** An account, no account,
 * a request still inside the cooldown — one response covers all three, because
 * anything else turns the form beside the sign-in box into a way to ask "does
 * this person have an account here". Sign-in spends an Argon2 verification to
 * avoid answering that; it would be a poor trade to leave it lying next to it.
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
    await requestPasswordReset(fields.email);
  } catch {
    return refuse(503, t("authUnreachable"));
  }
  return succeed();
}
