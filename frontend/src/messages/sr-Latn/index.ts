import type { PlatformMessages } from "@/messages/en";

import { account } from "./account";
import { common } from "./common";
import { content } from "./content";
import { errors } from "./errors";
import { guidance } from "./guidance";
import { screens } from "./screens";
import { superadmin } from "./superadmin";
import { workspace } from "./workspace";

/**
 * Serbian Latin catalogue.
 *
 * The `PlatformMessages` annotation is the second half of the parity guarantee:
 * per-namespace annotations catch a wrong key *inside* a namespace, and this one
 * catches a namespace that was added to English and never created here.
 */
export const srLatnMessages: PlatformMessages = {
  account,
  common,
  content,
  errors,
  guidance,
  screens,
  superadmin,
  workspace,
};
