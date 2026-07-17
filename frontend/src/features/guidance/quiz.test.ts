import { describe, expect, it } from "vitest";

import { therapists } from "@/content/therapists";

import {
  recommendTherapistSlugs,
  recommendTherapists,
  wantsServices,
} from "./quiz";

const ANJA = "anja-stamenkovic";
const MARIJA = "marija-stamenkovic";
const MARJAN = "marjan-jankovic";

describe("recommendTherapistSlugs", () => {
  it("recommends only Marija for adolescents", () => {
    expect(
      recommendTherapistSlugs(["Za adolescenta", null, null, null, null]),
    ).toEqual([MARIJA]);
  });

  it("recommends Anja and Marjan for couples", () => {
    expect(
      recommendTherapistSlugs(["Za partnerski odnos", null, null, null, null]),
    ).toEqual([ANJA, MARJAN]);
  });

  it("recommends Anja and Marija for parents", () => {
    expect(
      recommendTherapistSlugs(["Kao roditelj", null, null, null, null]),
    ).toEqual([ANJA, MARIJA]);
  });

  it("maps the topic when support is for oneself", () => {
    expect(
      recommendTherapistSlugs([
        "Za sebe",
        "Samopouzdanje i granice",
        null,
        null,
        null,
      ]),
    ).toEqual([MARIJA, MARJAN]);
  });

  it("returns everyone when the user asks for all therapists", () => {
    expect(
      recommendTherapistSlugs([
        "Za adolescenta",
        null,
        null,
        null,
        "Sve dostupne terapeute",
      ]),
    ).toEqual([ANJA, MARIJA, MARJAN]);
  });

  it("falls back to everyone for an unknown topic", () => {
    expect(
      recommendTherapistSlugs([
        "Za sebe",
        "Nisam siguran/na",
        null,
        null,
        null,
      ]),
    ).toEqual([ANJA, MARIJA, MARJAN]);
  });

  it("only ever recommends slugs that exist in the therapist data", () => {
    const known = new Set(therapists.map((therapist) => therapist.slug));
    const everySlug = [
      ...recommendTherapistSlugs(["Za adolescenta", null, null, null, null]),
      ...recommendTherapistSlugs([
        "Za partnerski odnos",
        null,
        null,
        null,
        null,
      ]),
      ...recommendTherapistSlugs(["Kao roditelj", null, null, null, null]),
      ...recommendTherapistSlugs(["Za sebe", "Roditeljstvo", null, null, null]),
      ...recommendTherapistSlugs(["Za sebe", "Lični razvoj", null, null, null]),
      ...recommendTherapistSlugs([
        "Za sebe",
        "Stres i iscrpljenost",
        null,
        null,
        null,
      ]),
    ];
    for (const slug of everySlug) {
      expect(known).toContain(slug);
    }
  });
});

describe("recommendTherapists", () => {
  it("resolves slugs to full profiles in recommendation order", () => {
    const result = recommendTherapists(
      ["Za partnerski odnos", null, null, null, null],
      therapists,
    );
    expect(result.map((therapist) => therapist.slug)).toEqual([ANJA, MARJAN]);
    expect(result[0]?.name).toBe("Anja Stamenković");
  });
});

describe("wantsServices", () => {
  it("detects the services outcome from the last answer", () => {
    expect(wantsServices([null, null, null, null, "Usluge i programe"])).toBe(
      true,
    );
    expect(wantsServices([null, null, null, null, null])).toBe(false);
  });
});
