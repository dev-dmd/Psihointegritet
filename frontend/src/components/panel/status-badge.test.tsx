import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge, type StatusBadgeTone } from "./status-badge";

describe("StatusBadge", () => {
  it("renders a visible text label for every tone, never color alone", () => {
    const tones: StatusBadgeTone[] = [
      "ok",
      "wait",
      "soft",
      "amber",
      "neutral",
      "danger",
      "dark",
    ];
    for (const tone of tones) {
      const { unmount } = render(
        <StatusBadge tone={tone}>{`status-${tone}`}</StatusBadge>,
      );
      expect(screen.getByText(`status-${tone}`)).toBeInTheDocument();
      unmount();
    }
  });
});
