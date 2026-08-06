"""
Reusable HTML email layout wrapper for Psihointegritet platform.

- Tables-only layout (no flexbox, no grid, no position:absolute)
- 600px max width
- Inline CSS only
- Safe fonts (Arial, Georgia, Verdana)
- Bulletproof email button pattern (works in Outlook)
"""

# ruff: noqa: E501  — inline CSS for HTML emails exceeds 100 chars by design

from __future__ import annotations


def _url(path: str) -> str:
    base = "https://psihointegritet.com"
    return f"{base.rstrip('/')}/{path.lstrip('/')}"


def email_button(label: str, url: str, bg_color: str = "#2e3b2e") -> str:
    """Bulletproof email button — works in Outlook, Gmail, Apple Mail."""
    return f"""<!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      href="{url}" style="height:42px;v-text-anchor:middle;width:200px;"
      arcsize="50%" strokecolor="{bg_color}" fillcolor="{bg_color}">
      <w:anchorlock/>
      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">
        {label}
      </center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-- -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td align="center" style="border-radius:50px;background-color:{bg_color};">
          <a href="{url}" target="_blank"
            style="display:inline-block;padding:12px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;white-space:nowrap;border-radius:50px;">
            {label}
          </a>
        </td>
      </tr>
    </table>
    <!--<![endif]-->"""


def email_divider() -> str:
    return """<tr>
      <td style="padding:0 0 20px 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="border-bottom:1px solid rgba(58,46,40,0.08);font-size:1px;line-height:1px;">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>"""


def email_header(logo_url: str, app_name: str) -> str:
    return f"""<!-- HEADER -->
    <tr>
      <td align="center" style="padding:40px 32px 24px 32px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom:12px;">
              <img src="{logo_url}" width="48" height="48"
                alt="{app_name}"
                style="display:block;width:48px;height:48px;max-width:48px;border:0;outline:none;text-decoration:none;">
            </td>
          </tr>
          <tr>
            <td align="center">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#2e3b2e;letter-spacing:-0.2px;line-height:1.3;">
                {app_name}
              </h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>"""


def email_footer() -> str:
    app_url = _url("")
    return f"""<!-- FOOTER -->
    <tr>
      <td align="center" style="padding:28px 32px 32px 32px;">
        <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(58,46,40,0.45);line-height:1.5;">
          Psihointegritet — digitalni centar za mentalno zdravlje
        </p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:rgba(58,46,40,0.3);line-height:1.5;">
          <a href="{app_url}" target="_blank" style="color:rgba(58,46,40,0.45);text-decoration:underline;">psihointegritet.com</a>
          &nbsp;·&nbsp;
          <a href="{app_url}/privatnost" target="_blank" style="color:rgba(58,46,40,0.45);text-decoration:underline;">Privatnost</a>
        </p>
      </td>
    </tr>"""


def wrap_email(title: str, body_html: str, preheader: str = "") -> str:
    """Wrap any email body in the standard Psihointegritet layout.

    Args:
        title: Appears in <title> tag.
        body_html: Inner content (rows to be placed between header and footer).
        preheader: Short text shown in inbox preview (max 100 chars).
    """
    logo_url = _url("images/kompas-logo.png")

    return f"""<!DOCTYPE html>
<html lang="sr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>{title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style type="text/css">
    * {{ margin:0; padding:0; }}
    body,table,td,a {{ -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }}
    table,td {{ mso-table-lspace:0pt; mso-table-rspace:0pt; }}
    img {{ -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }}
    a {{ text-decoration:none; }}
    @media only screen and (max-width:600px) {{
      .email-container {{ width:100% !important; }}
      .content-cell {{ padding:24px 20px !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f0f0;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Preheader -->
  <div style="display:none;font-size:1px;color:#f0f0f0;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    {preheader or title}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0f0f0;">
    <tr>
      <td align="center" valign="top" style="padding:32px 16px;">

        <!-- Main container 600px -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600"
          style="max-width:600px;background-color:#ffffff;border-radius:22px;overflow:hidden;"
          class="email-container">

          {email_header(logo_url, "Psihointegritet")}
          {body_html}
          {email_footer()}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
