import type { PlatformMessages } from "@/messages/en";

import { common } from "./common";
import { errors } from "./errors";

/**
 * Serbian Latin catalogue.
 *
 * The `PlatformMessages` annotation is the second half of the parity guarantee:
 * per-namespace annotations catch a wrong key *inside* a namespace, and this one
 * catches a namespace that was added to English and never created here.
 */
export const srLatnMessages: PlatformMessages = {
  common,
  errors,
};
