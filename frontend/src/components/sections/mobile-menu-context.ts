"use client";

import { createContext } from "react";

/**
 * Lets controls rendered inside the mobile drawer (e.g. the auth section) close
 * it on tap. Provided by `MobileMenu`, consumed via `useContext`.
 *
 * This replaces the earlier `cloneElement(authSlot, { onNavigate })`: `authSlot`
 * is a client element created in the Server Component header, and cloning such
 * an RSC-passed element on the client yields an element with `type: undefined`,
 * which crashed the drawer ("Element type is invalid"). Rendering `authSlot`
 * as-is and passing the close handler through context avoids the clone entirely.
 */
export const MobileDrawerCloseContext = createContext<() => void>(() => {});
