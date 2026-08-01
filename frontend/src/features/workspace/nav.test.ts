import { describe, expect, it } from "vitest";

import { visibleNav } from "./nav";

function labels(flags: { isAdmin: boolean; isTherapist: boolean }): string[] {
  return visibleNav(flags).flatMap((section) =>
    section.items.map((item) => item.label),
  );
}

describe("visibleNav", () => {
  it("shows a therapist only their own working set", () => {
    const items = labels({ isAdmin: false, isTherapist: true });
    expect(items).toEqual(["Pregled", "Termini", "Klijenti", "Moj profil"]);
  });

  it("shows a pure admin the business set without Moj profil", () => {
    const items = labels({ isAdmin: true, isTherapist: false });
    expect(items).toContain("Kompanije");
    expect(items).toContain("Usluge i cene");
    expect(items).toContain("Terapeuti");
    expect(items).toContain("Lokacije i način rada");
    expect(items).not.toContain("Moj profil");
  });

  it("shows the union for someone who is both", () => {
    const items = labels({ isAdmin: true, isTherapist: true });
    expect(items).toContain("Kompanije");
    expect(items).toContain("Terapeuti");
    expect(items).toContain("Moj profil");
  });

  it("keeps the Tim caption for a therapist even without admin items", () => {
    const sections = visibleNav({ isAdmin: false, isTherapist: true });
    const tim = sections.find((section) => section.caption === "Tim");
    expect(tim?.items.map((item) => item.label)).toEqual(["Moj profil"]);
  });

  it("drops empty sections (Poslovanje/Podešavanja) for a therapist", () => {
    const captions = visibleNav({ isAdmin: false, isTherapist: true })
      .map((section) => section.caption)
      .filter(Boolean);
    expect(captions).not.toContain("Poslovanje");
    expect(captions).not.toContain("Podešavanja");
  });
});
