// Minimal, inline-styled transactional email (works in Gmail/Outlook). Returns { html, text }.
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

export const renderEmail = ({ heading, body, buttonLabel, url, footer }) => {
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px">
      <tr><td style="padding:32px">
        <h1 style="margin:0 0 16px;font-size:20px">${escape(heading)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.5">${escape(body)}</p>
        <a href="${escape(url)}" style="display:inline-block;padding:12px 20px;background:#1c1917;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px">${escape(buttonLabel)}</a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#57534e">Or paste this link into your browser:<br><a href="${escape(url)}" style="color:#57534e;word-break:break-all">${escape(url)}</a></p>
        <p style="margin:16px 0 0;font-size:13px;color:#57534e">${escape(footer)}</p>
      </td></tr>
    </table>
  </body>
</html>`;
  const text = `${heading}\n\n${body}\n\n${buttonLabel}: ${url}\n\n${footer}`;
  return { html, text };
};
