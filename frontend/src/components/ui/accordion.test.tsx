import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Accordion, type AccordionItem } from "./accordion";

const items: AccordionItem[] = [
  { id: "a", question: "Prvo pitanje?", answer: "Prvi odgovor." },
  { id: "b", question: "Drugo pitanje?", answer: "Drugi odgovor." },
];

describe("Accordion", () => {
  it("starts collapsed and opens an item on click", async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);

    expect(screen.queryByText("Prvi odgovor.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Prvo pitanje?" }));

    expect(screen.getByText("Prvi odgovor.")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Prvo pitanje?" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps a single item open at a time", async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} defaultOpenId="a" />);

    expect(screen.getByText("Prvi odgovor.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Drugo pitanje?" }));

    expect(screen.queryByText("Prvi odgovor.")).not.toBeInTheDocument();
    expect(screen.getByText("Drugi odgovor.")).toBeVisible();
  });

  it("closes the open item when clicked again", async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} defaultOpenId="a" />);

    await user.click(screen.getByRole("button", { name: "Prvo pitanje?" }));

    expect(screen.queryByText("Prvi odgovor.")).not.toBeInTheDocument();
  });
});
