import type { Widen } from "@/messages/types";

import { account } from "./account";
import { common } from "./common";
import { content } from "./content";
import { errors } from "./errors";
import { guidance } from "./guidance";
import { publicUi } from "./public";
import { screens } from "./screens";
import { superadmin } from "./superadmin";
import { workspace } from "./workspace";

/**
 * The canonical English catalogue. Every other locale is annotated against it.
 *
 * Namespaces are separate modules on both sides on purpose: TypeScript's
 * excess-property check only fires on a *fresh* object literal, so each
 * translated namespace must carry its own annotation. Composing everything in
 * one file would silently accept an unknown key in a namespace.
 */
export const enMessages = {
  account,
  common,
  content,
  errors,
  guidance,
  public: publicUi,
  screens,
  superadmin,
  workspace,
} as const;

/** Literal leaf types — what `AppConfig["Messages"]` points at. */
export type EnMessages = typeof enMessages;

/**
 * The shape every catalogue must have, with `string` leaves.
 *
 * Used to annotate translated catalogues so their values are free while their
 * shape is fixed. Deliberately NOT what `AppConfig["Messages"]` uses — see the
 * note in `src/i18n/next-intl.d.ts`.
 */
export type PlatformMessages = Widen<EnMessages>;
