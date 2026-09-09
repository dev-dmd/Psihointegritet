"""Email templates for the Content Review workflow (RW-7).

Each function returns a complete HTML string ready to send via Resend.
"""

# ruff: noqa: E501  — inline HTML styles exceed 100 chars by design

from __future__ import annotations

from psihointegritet.infrastructure.email.layout import (
    email_base_url,
    email_button,
    email_divider,
    wrap_email,
)


def _app_url(path: str) -> str:
    return f"{email_base_url()}{path}"


def review_requested_email(
    reviewer_name: str,
    article_slug: str,
    entry_id: str,
    sender_name: str,
) -> str:
    """Notify a reviewer that a new text is waiting for their review."""
    review_url = _app_url(f"/radni-prostor/kompas/sadrzaj/{entry_id}")
    body = f"""
    <!-- HERO -->
    <tr>
      <td class="content-cell" style="padding:0 32px 20px 32px;">
        <h2 style="margin:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:700;color:#3a2e28;line-height:1.3;">
          Novi tekst čeka vaš stručni pregled
        </h2>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(58,46,40,0.7);line-height:1.6;">
          Poštovani/a <strong style="color:#3a2e28;">{reviewer_name}</strong>,
        </p>
      </td>
    </tr>

    <!-- CONTENT -->
    <tr>
      <td class="content-cell" style="padding:0 32px 20px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(58,46,40,0.7);line-height:1.6;">
          <strong style="color:#3a2e28;">{sender_name}</strong> je poslao/la tekst na stručni pregled.
        </p>
      </td>
    </tr>

    <!-- CARD -->
    <tr>
      <td class="content-cell" style="padding:0 32px 24px 32px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
          style="border:1px solid rgba(58,46,40,0.08);border-radius:14px;">
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 4px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;color:#2e3b2e;">
                {article_slug}
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:rgba(58,46,40,0.45);line-height:1.5;">
                Poslao/la {sender_name}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    {email_divider()}

    <!-- CTA -->
    <tr>
      <td align="center" style="padding:0 32px 28px 32px;">
        {email_button("Otvori tekst na pregledu", review_url, "#2e3b2e")}
      </td>
    </tr>

    <!-- NOTE -->
    <tr>
      <td class="content-cell" style="padding:0 32px 24px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:rgba(58,46,40,0.4);line-height:1.5;font-style:italic;">
          Otvorite administratorski panel da biste pregledali tekst i doneli odluku.
        </p>
      </td>
    </tr>"""

    return wrap_email(
        title=f"Novi tekst na pregledu — {article_slug}",
        body_html=body,
        preheader=f'{sender_name} je poslao/la "{article_slug}" na stručni pregled.',
    )


def changes_requested_email(
    author_name: str,
    article_slug: str,
    entry_id: str,
    reviewer_name: str,
    capability: str,
    note: str,
) -> str:
    """Notify the author that a reviewer requested changes."""
    draft_url = _app_url(f"/radni-prostor/kompas/sadrzaj/{entry_id}")
    cap_label = {
        "clinical": "Stručni pregled",
        "business": "Poslovni pregled",
        "legal": "Pravni pregled",
    }.get(capability, capability)

    body = f"""
    <!-- HERO -->
    <tr>
      <td class="content-cell" style="padding:0 32px 20px 32px;">
        <h2 style="margin:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:700;color:#3a2e28;line-height:1.3;">
          Potrebne su izmene na tekstu
        </h2>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(58,46,40,0.7);line-height:1.6;">
          Poštovani/a <strong style="color:#3a2e28;">{author_name}</strong>,
        </p>
      </td>
    </tr>

    <!-- CONTENT -->
    <tr>
      <td class="content-cell" style="padding:0 32px 20px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(58,46,40,0.7);line-height:1.6;">
          <strong style="color:#3a2e28;">{reviewer_name}</strong> ({cap_label}) je vratio/la tekst <strong style="color:#3a2e28;">{article_slug}</strong> na doradu.
        </p>
      </td>
    </tr>

    <!-- REASON CARD -->
    <tr>
      <td class="content-cell" style="padding:0 32px 24px 32px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
          style="border:1px solid rgba(138,106,59,0.25);border-radius:14px;background-color:rgba(209,164,140,0.08);">
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#8a6a3b;text-transform:uppercase;letter-spacing:1px;">
                Obrazloženje
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:rgba(58,46,40,0.7);line-height:1.6;font-style:italic;">
                {note}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    {email_divider()}

    <!-- CTA -->
    <tr>
      <td align="center" style="padding:0 32px 28px 32px;">
        {email_button("Pregledaj izmene i pošalji ponovo", draft_url, "#2e3b2e")}
      </td>
    </tr>

    <!-- NOTE -->
    <tr>
      <td class="content-cell" style="padding:0 32px 24px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:rgba(58,46,40,0.4);line-height:1.5;font-style:italic;">
          Otvorite novu radnu verziju, izmenite tekst i pošaljite ga ponovo na pregled.
        </p>
      </td>
    </tr>"""

    return wrap_email(
        title=f"Izmene potrebne — {article_slug}",
        body_html=body,
        preheader=f'{reviewer_name} je vratio/la "{article_slug}" na doradu.',
    )


def review_approved_email(
    author_name: str,
    article_slug: str,
    entry_id: str,
) -> str:
    """Notify the author that all required approvals have been given."""
    article_url = _app_url(f"/radni-prostor/kompas/sadrzaj/{entry_id}")

    body = f"""
    <!-- HERO -->
    <tr>
      <td class="content-cell" style="padding:0 32px 20px 32px;">
        <h2 style="margin:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:700;color:#3a2e28;line-height:1.3;">
          Tekst je odobren za objavu ✓
        </h2>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(58,46,40,0.7);line-height:1.6;">
          Poštovani/a <strong style="color:#3a2e28;">{author_name}</strong>,
        </p>
      </td>
    </tr>

    <!-- CONTENT -->
    <tr>
      <td class="content-cell" style="padding:0 32px 20px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(58,46,40,0.7);line-height:1.6;">
          Sva potrebna odobrenja za tekst <strong style="color:#3a2e28;">{article_slug}</strong> su data. Tekst je spreman za objavljivanje.
        </p>
      </td>
    </tr>

    {email_divider()}

    <!-- CTA -->
    <tr>
      <td align="center" style="padding:0 32px 28px 32px;">
        {email_button("Objavi tekst", article_url, "#2e3b2e")}
      </td>
    </tr>

    <!-- NOTE -->
    <tr>
      <td class="content-cell" style="padding:0 32px 24px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:rgba(58,46,40,0.4);line-height:1.5;font-style:italic;">
          Otvorite panel i kliknite "Objavi" da tekst postane vidljiv posetiocima.
        </p>
      </td>
    </tr>"""

    return wrap_email(
        title=f"Tekst odobren — {article_slug}",
        body_html=body,
        preheader=f'Sva odobrenja za "{article_slug}" su data.',
    )


def email_verification_email(display_name: str | None, verify_url: str) -> str:
    """Confirm that whoever registered this address can actually read it.

    The only thing standing between an open registration endpoint and somebody
    claiming an address that is about to be provisioned to a colleague. It is
    sent once, at registration, and the account cannot sign in until the link
    in it is spent (`AuthFailureReason.EMAIL_NOT_VERIFIED`).

    Addressed by name when there is one and impersonally when there is not —
    never with the address itself, which would put it in a mail that may be
    forwarded, and would confirm to a stranger that the address is registered.
    """
    greeting = (
        f'Poštovani/a <strong style="color:#3a2e28;">{display_name}</strong>,'
        if display_name
        else "Poštovani/a,"
    )
    body = f"""
    <!-- HERO -->
    <tr>
      <td class="content-cell" style="padding:0 32px 20px 32px;">
        <h2 style="margin:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:700;color:#3a2e28;line-height:1.3;">
          Potvrdite svoju adresu
        </h2>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(58,46,40,0.7);line-height:1.6;">
          {greeting}
        </p>
      </td>
    </tr>

    <!-- CONTENT -->
    <tr>
      <td class="content-cell" style="padding:0 32px 20px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(58,46,40,0.7);line-height:1.6;">
          Nalog na ovoj adresi je upravo otvoren. Dok ne potvrdite adresu, prijava nije moguća.
        </p>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td class="content-cell" align="center" style="padding:0 32px 24px 32px;">
        {email_button("Potvrdi adresu", verify_url)}
      </td>
    </tr>

    {email_divider()}

    <!-- FOOTNOTE -->
    <tr>
      <td class="content-cell" style="padding:0 32px 24px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:rgba(58,46,40,0.55);line-height:1.6;">
          Link važi 24 sata i može se iskoristiti jednom.
          <strong style="color:#3a2e28;">Ako niste vi otvorili ovaj nalog</strong>, ništa ne
          preduzimajte — bez potvrde nalog ostaje neupotrebljiv i vaša adresa ostaje slobodna.
        </p>
      </td>
    </tr>
    """
    return wrap_email(
        title="Potvrdite svoju adresu",
        body_html=body,
        preheader="Potvrdite adresu da biste mogli da se prijavite.",
    )


def password_reset_email(display_name: str | None, reset_url: str) -> str:
    """A link that sets a new password, requested by whoever typed the address.

    Sent from `/password/forgot`, which anybody may call for any address. That
    shapes the copy more than anything else here: this mail may well arrive for
    somebody who did not ask for it, so it has to read as harmless to that
    person and be explicit that ignoring it costs nothing.

    It says nothing the recipient does not already know — no membership, no
    organization, not even the address it was sent to. A mail that recites the
    account back to its reader is a mail that hands all of it to whoever the
    mailbox is later forwarded to.
    """
    greeting = (
        f'Poštovani/a <strong style="color:#3a2e28;">{display_name}</strong>,'
        if display_name
        else "Poštovani/a,"
    )
    body = f"""
    <!-- HERO -->
    <tr>
      <td class="content-cell" style="padding:0 32px 20px 32px;">
        <h2 style="margin:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:700;color:#3a2e28;line-height:1.3;">
          Postavite novu lozinku
        </h2>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(58,46,40,0.7);line-height:1.6;">
          {greeting}
        </p>
      </td>
    </tr>

    <!-- CONTENT -->
    <tr>
      <td class="content-cell" style="padding:0 32px 20px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(58,46,40,0.7);line-height:1.6;">
          Neko je zatražio novu lozinku za nalog na ovoj adresi. Ako ste to bili vi,
          postavite je preko dugmeta ispod.
        </p>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td class="content-cell" align="center" style="padding:0 32px 24px 32px;">
        {email_button("Postavite lozinku", reset_url)}
      </td>
    </tr>

    {email_divider()}

    <!-- FOOTNOTE -->
    <tr>
      <td class="content-cell" style="padding:0 32px 24px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:rgba(58,46,40,0.55);line-height:1.6;">
          Link važi jedan sat i može se iskoristiti jednom. Postavljanje nove lozinke
          odjavljuje sve uređaje sa ovog naloga.
          <strong style="color:#3a2e28;">Ako niste vi zatražili promenu</strong>, ništa ne
          preduzimajte — lozinka ostaje ista dok se link ne iskoristi.
        </p>
      </td>
    </tr>
    """
    return wrap_email(
        title="Postavite novu lozinku",
        body_html=body,
        preheader="Link za postavljanje nove lozinke.",
    )
