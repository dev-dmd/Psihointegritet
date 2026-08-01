import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmModal } from "./confirm-modal";

function renderModal(onConfirm = vi.fn(), onClose = vi.fn()) {
  render(
    <ConfirmModal
      open
      eyebrow="Potvrda promene"
      title="Loyalty Engine"
      description="Tenant Psihointegritet · Iskljuceno u Ukljuceno"
      reasonLabel="Razlog promene — obavezno"
      reasonPlaceholder="npr. Dogovor sa vlasnicom centra"
      note="Promena se upisuje u Audit Log."
      confirmLabel="Potvrdi promenu"
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );
  return { onConfirm, onClose };
}

describe("ConfirmModal", () => {
  it("keeps confirm disabled until a reason is entered", () => {
    renderModal();
    const confirm = screen.getByRole("button", { name: "Potvrdi promenu" });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Razlog promene/), {
      target: { value: "   " },
    });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Razlog promene/), {
      target: { value: "Dogovor sa timom" },
    });
    expect(confirm).toBeEnabled();
  });

  it("passes the trimmed reason to onConfirm", () => {
    const { onConfirm } = renderModal();
    fireEvent.change(screen.getByLabelText(/Razlog promene/), {
      target: { value: "  Dogovor sa timom  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Potvrdi promenu" }));
    expect(onConfirm).toHaveBeenCalledWith("Dogovor sa timom");
  });

  it("cancels without confirming", () => {
    const { onConfirm, onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Odustani" }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
