import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ReadinessChecklist,
  type ReadinessCheck,
  type ReadinessCheckStatus,
} from "./readiness-checklist";

function checks(...statuses: ReadinessCheckStatus[]): readonly ReadinessCheck[] {
  return statuses.map((status, index) => {
    const check: ReadinessCheck = {
      label: `Check ${index + 1}`,
      status,
    };
    if (status === "error") {
      check.note = "Proverite backend servise";
    }
    return check;
  });
}

describe("ReadinessChecklist", () => {
  it("renders the heading immediately", () => {
    render(<ReadinessChecklist checks={checks("loading")} />);
    expect(
      screen.getByRole("heading", { name: "Spremnost za testiranje i objavu" }),
    ).toBeVisible();
  });

  it("renders a check in loading state with the correct aria label", () => {
    render(<ReadinessChecklist checks={checks("loading")} />);
    expect(screen.getByLabelText("Učitavanje")).toBeInTheDocument();
  });

  it("renders a check in ok state with the correct aria label", () => {
    render(<ReadinessChecklist checks={checks("ok")} />);
    expect(screen.getByLabelText("Spremno")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("renders a check in pending state with the correct aria label", () => {
    render(<ReadinessChecklist checks={checks("pending")} />);
    expect(screen.getByLabelText("Na čekanju")).toBeInTheDocument();
    expect(screen.getByText("○")).toBeInTheDocument();
  });

  it("renders a check in error state with the correct aria label and note", () => {
    render(<ReadinessChecklist checks={checks("error")} />);
    expect(screen.getByLabelText("Greška")).toBeInTheDocument();
    expect(screen.getByText("✗")).toBeInTheDocument();
    expect(screen.getByText(/Proverite backend servise/)).toBeInTheDocument();
  });

  it("renders all four check items", () => {
    render(
      <ReadinessChecklist
        checks={checks("ok", "loading", "pending", "error")}
      />,
    );
    expect(screen.getByLabelText("Spremno")).toBeInTheDocument();
    expect(screen.getByLabelText("Učitavanje")).toBeInTheDocument();
    expect(screen.getByLabelText("Na čekanju")).toBeInTheDocument();
    expect(screen.getByLabelText("Greška")).toBeInTheDocument();
  });

  it("renders error state with danger color class", () => {
    render(<ReadinessChecklist checks={checks("error")} />);
    const errorIcon = screen.getByLabelText("Greška");
    expect(errorIcon).toHaveClass("text-badge-danger");
  });

  it("renders ok state with success color class", () => {
    render(<ReadinessChecklist checks={checks("ok")} />);
    const okIcon = screen.getByLabelText("Spremno");
    expect(okIcon).toHaveClass("text-badge-ok");
  });

  it("renders pending state with amber color class", () => {
    render(<ReadinessChecklist checks={checks("pending")} />);
    const pendingIcon = screen.getByLabelText("Na čekanju");
    expect(pendingIcon).toHaveClass("text-badge-amber");
  });
});
