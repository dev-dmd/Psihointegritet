import { describe, expect, it } from "vitest";

import { therapists } from "@/content/homepage";

import {
  recommendTherapistIds,
  recommendTherapists,
  wantsServices,
} from "./quiz";

describe("recommendTherapistIds", () => {
  it("recommends only MS for adolescents", () => {
    expect(
      recommendTherapistIds(["Za adolescenta", null, null, null, null]),
    ).toEqual(["ms"]);
  });

  it("recommends AS and MJ for couples", () => {
    expect(
      recommendTherapistIds(["Za partnerski odnos", null, null, null, null]),
    ).toEqual(["as", "mj"]);
  });

  it("recommends AS and MS for parents", () => {
    expect(
      recommendTherapistIds(["Kao roditelj", null, null, null, null]),
    ).toEqual(["as", "ms"]);
  });

  it("maps the topic when support is for oneself", () => {
    expect(
      recommendTherapistIds([
        "Za sebe",
        "Samopouzdanje i granice",
        null,
        null,
        null,
      ]),
    ).toEqual(["ms", "as"]);
  });

  it("returns everyone when the user asks for all therapists", () => {
    expect(
      recommendTherapistIds([
        "Za adolescenta",
        null,
        null,
        null,
        "Sve dostupne terapeute",
      ]),
    ).toEqual(["as", "ms", "mj"]);
  });

  it("falls back to everyone for an unknown topic", () => {
    expect(
      recommendTherapistIds(["Za sebe", "Nisam siguran/na", null, null, null]),
    ).toEqual(["as", "ms", "mj"]);
  });
});

describe("recommendTherapists", () => {
  it("resolves ids to full profiles in recommendation order", () => {
    const result = recommendTherapists(
      ["Za partnerski odnos", null, null, null, null],
      therapists,
    );
    expect(result.map((t) => t.id)).toEqual(["as", "mj"]);
    expect(result[0]?.name).toBe("A. S.");
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
