import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ADULT_SUBJECT_AGE_BAND,
  GOALS,
  PARTICIPANTS,
  REASONS,
  REQUESTER_ROLES,
  SUBJECT_AGE_BANDS,
  WORK_FORMATS,
  emptyIntakeAnswers,
} from "./matching";
import { IntakeRequestForm } from "./intake-request-form";

afterEach(() => {
  vi.unstubAllGlobals();
});

function successfulResponse(
  submissionKind: "request" | "team_review" = "request",
  reviewPriority: "standard" | "priority" = "standard",
) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({ submissionKind, reviewPriority }),
  };
}

async function fillRequiredContact(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Ime i prezime/), "Petar Petrović");
  await user.type(
    screen.getByRole("textbox", { name: "Email" }),
    "petar@example.com",
  );
}

async function acceptRequiredNotices(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText(/obaveštenjem o obradi podataka/));
  await user.click(screen.getByLabelText(/nije potvrda termina/));
}

describe("IntakeRequestForm", () => {
  it("submits adult contact, acknowledgements and no booking slot", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(successfulResponse());
    vi.stubGlobal("fetch", fetchMock);

    render(
      <IntakeRequestForm
        answers={{
          ...emptyIntakeAnswers,
          requesterRole: REQUESTER_ROLES.selfAdult,
          subjectAgeBand: ADULT_SUBJECT_AGE_BAND,
          reason: REASONS.burnout,
          participants: PARTICIPANTS.alone,
          goal: GOALS.stress,
          format: WORK_FORMATS.online,
        }}
        submissionKind="request"
        preferredTherapistSlug="anja-stamenkovic"
        onBack={vi.fn()}
      />,
    );

    await fillRequiredContact(user);
    await user.type(
      screen.getByLabelText(/Želite li nešto da dodate/),
      "Kratka dodatna poruka.",
    );
    const submit = screen.getByRole("button", { name: "Pošaljite zahtev" });
    expect(submit).toBeDisabled();
    await acceptRequiredNotices(user);
    expect(submit).toBeEnabled();

    await user.click(submit);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/intake/submit",
      expect.objectContaining({ method: "POST" }),
    );
    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(requestOptions.body)) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      submissionKind: "request",
      preferredTherapistSlug: "anja-stamenkovic",
      guardianConsentStatus: "not_applicable",
      freeText: "Kratka dodatna poruka.",
    });
    expect(JSON.stringify(payload)).not.toContain("preferredDate");
    expect(JSON.stringify(payload)).not.toContain("preferredTime");
    expect(screen.getByText("Hvala što ste nam se javili.")).toBeVisible();
  });

  it("collects only guardian metadata and keeps the child unnamed", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(successfulResponse("team_review"));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <IntakeRequestForm
        answers={{
          ...emptyIntakeAnswers,
          requesterRole: REQUESTER_ROLES.guardian,
          subjectAgeBand: SUBJECT_AGE_BANDS[1],
          reason: REASONS.parenting,
          participants: PARTICIPANTS.parentChild,
          goal: GOALS.improveChild,
          format: WORK_FORMATS.online,
        }}
        submissionKind="team_review"
        preferredTherapistSlug={null}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText(/ne tražimo puno ime deteta/i)).toBeVisible();
    await fillRequiredContact(user);
    await user.click(screen.getByLabelText("Da"));
    await user.click(
      screen.getByLabelText(/Podnosim zahtev kao roditelj\/staratelj/),
    );
    await user.type(
      screen.getByLabelText(/Želite li nešto da dodate/),
      "Kratka napomena za tim.",
    );
    await acceptRequiredNotices(user);
    await user.click(screen.getByRole("button", { name: "Pošaljite zahtev" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(requestOptions.body)) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      submissionKind: "team_review",
      subjectIsAware: true,
      guardianConsentStatus: "confirmed",
      freeText: "Kratka napomena za tim.",
    });
    expect(JSON.stringify(payload)).not.toContain("childName");
  });

  it("keeps the adolescent flow free of additional text", () => {
    render(
      <IntakeRequestForm
        answers={{
          ...emptyIntakeAnswers,
          requesterRole: REQUESTER_ROLES.adolescent,
          subjectAgeBand: SUBJECT_AGE_BANDS[2],
          reason: REASONS.adolescent,
          participants: PARTICIPANTS.alone,
          goal: GOALS.emotions,
          format: WORK_FORMATS.online,
        }}
        submissionKind="team_review"
        preferredTherapistSlug={null}
        onBack={vi.fn()}
      />,
    );

    expect(
      screen.queryByLabelText(/Želite li nešto da dodate/),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/ne tražimo kontakt roditelja/i)).toBeVisible();
  });

  it("shows immediate-support copy and switches a submitted safety signal to team review", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(successfulResponse("team_review", "priority"));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <IntakeRequestForm
        answers={{
          ...emptyIntakeAnswers,
          requesterRole: REQUESTER_ROLES.selfAdult,
          subjectAgeBand: ADULT_SUBJECT_AGE_BAND,
          reason: REASONS.other,
          participants: PARTICIPANTS.alone,
          goal: GOALS.unsure,
          format: WORK_FORMATS.online,
        }}
        submissionKind="request"
        preferredTherapistSlug={null}
        onBack={vi.fn()}
      />,
    );

    await fillRequiredContact(user);
    await user.type(
      screen.getByLabelText(/Želite li nešto da dodate/),
      "Trenutno sam u opasnosti.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Platforma nije hitna služba",
    );
    await acceptRequiredNotices(user);
    await user.click(screen.getByRole("button", { name: "Pošaljite zahtev" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(requestOptions.body)) as Record<
      string,
      unknown
    >;
    expect(payload.submissionKind).toBe("team_review");
    expect(screen.getByText(/prioritetni ljudski pregled/i)).toBeVisible();
  });
});
