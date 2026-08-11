import { describe, expect, it } from "vitest";

import { getPlatformMessages } from "@/messages";

import { visibleNav } from "./nav";

type Flags = { isAdmin: boolean; isTherapist: boolean };

/**
 * `visibleNav` decides *which screens a role sees*, not what they are called.
 * Asserting on label keys keeps the test about that, so rewording a menu item
 * no longer edits a role-filtering test — which is how a copy change used to
 * be able to look like a permissions change in review.
 *
 * The wording is covered separately, below.
 */
function keys(flags: Flags): string[] {
  return visibleNav(flags).flatMap((section) =>
    section.items.map((item) => item.labelKey),
  );
}

describe("visibleNav", () => {
  it("shows a therapist only their own working set", () => {
    expect(keys({ isAdmin: false, isTherapist: true })).toEqual([
      "home",
      "appointments",
      "clients",
      "profile",
    ]);
  });

  it("shows a pure admin the business set without their own profile", () => {
    const items = keys({ isAdmin: true, isTherapist: false });
    expect(items).toContain("companies");
    expect(items).toContain("services");
    expect(items).toContain("therapists");
    expect(items).toContain("locations");
    expect(items).not.toContain("profile");
  });

  it("shows the union for someone who is both", () => {
    const items = keys({ isAdmin: true, isTherapist: true });
    expect(items).toContain("companies");
    expect(items).toContain("therapists");
    expect(items).toContain("profile");
  });

  it("keeps the team section for a therapist even without admin items", () => {
    const sections = visibleNav({ isAdmin: false, isTherapist: true });
    const team = sections.find((section) => section.captionKey === "team");
    expect(team?.items.map((item) => item.labelKey)).toEqual(["profile"]);
  });

  it("drops empty sections for a therapist", () => {
    const captions = visibleNav({ isAdmin: false, isTherapist: true })
      .map((section) => section.captionKey)
      .filter(Boolean);
    expect(captions).not.toContain("business");
    expect(captions).not.toContain("settings");
  });
});

describe("Serbian navigation wording", () => {
  /**
   * The acceptance criterion for I18N-4: the live tenant sees **byte-identical**
   * text to what was hardcoded before the extraction.
   *
   * Written out rather than derived from the catalogue — a derived expectation
   * would move together with the typo it is supposed to catch.
   */
  const nav = getPlatformMessages("sr-Latn").workspace.nav;

  it("renders every menu item exactly as before the extraction", () => {
    expect({
      home: nav.home,
      appointments: nav.appointments,
      clients: nav.clients,
      companies: nav.companies,
      services: nav.services,
      research: nav.research,
      documents: nav.documents,
      content: nav.content,
      compass: nav.compass,
      therapists: nav.therapists,
      profile: nav.profile,
      locations: nav.locations,
      notifications: nav.notifications,
      centreSettings: nav.centreSettings,
    }).toEqual({
      home: "Pregled",
      appointments: "Termini",
      clients: "Klijenti",
      companies: "Kompanije",
      services: "Usluge i cene",
      research: "Istraživanja",
      documents: "Dokumenti i saglasnosti",
      content: "Sadržaj",
      compass: "Kompas",
      therapists: "Terapeuti",
      profile: "Moj profil",
      locations: "Lokacije i način rada",
      notifications: "Obaveštenja",
      centreSettings: "Podešavanja centra",
    });
  });

  it("renders section captions and shell chrome exactly as before", () => {
    expect(nav.sections).toEqual({
      business: "Poslovanje",
      team: "Tim",
      settings: "Podešavanja",
    });
    expect(nav.more).toBe("Više");
    expect(nav.soon).toBe("Uskoro");
    expect(nav.hasError).toBe("(ima grešku)");
  });

  it("gives every nav item a key that exists in the catalogue", () => {
    // Catches an item added to `nav.tsx` without its copy — which renders the
    // raw key in the sidebar rather than failing anywhere.
    for (const flags of [
      { isAdmin: true, isTherapist: true },
      { isAdmin: true, isTherapist: false },
      { isAdmin: false, isTherapist: true },
    ]) {
      for (const section of visibleNav(flags)) {
        if (section.captionKey) {
          expect(nav.sections[section.captionKey]).toBeTruthy();
        }
        for (const item of section.items) {
          expect(nav[item.labelKey], item.routeId).toBeTruthy();
        }
      }
    }
  });
});
