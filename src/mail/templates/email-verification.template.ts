interface EmailVerificationParams {
  email: string;
  code: string;
  frontendUrl: string;
}

export const emailVerificationTemplate = ({
  email,
  code,
  frontendUrl,
}: EmailVerificationParams) => {
  const encodedEmail = encodeURIComponent(email);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Підтвердження Email - MyTime</title>
    </head>
    <body style="font-family: sans-serif; background-color: #FCF9F9; padding: 20px; margin: 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 20px; padding: 40px; box-shadow: 0 4px 24px -4px rgba(222, 44, 78, 0.12);">
              <tr>
                <td align="center" style="padding-bottom: 20px;">
                  <span style="display: block; font-size: 24px; font-weight: bold; color: #DE2C4E; letter-spacing: 2px; margin-bottom: 10px;">MyTime</span>
                  <h1 style="color: #383232; margin: 0; font-size: 24px; font-weight: bold;">Підтвердження реєстрації</h1>
                </td>
              </tr>
              <tr>
                <td style="color: #797171; font-size: 16px; line-height: 24px; text-align: center; padding-bottom: 30px;">
                  Вітаємо у <b>MyTime</b>! Ваш код підтвердження для завершення реєстрації:
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-bottom: 30px;">
                  <div style="background-color: #F7F2F2; border: 1px solid #EBE6E6; border-radius: 12px; padding: 15px 30px; display: inline-block;">
                    <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #DE2C4E;">${code}</span>
                  </div>
                </td>
              </tr>
              <tr>
                 <td align="center" style="padding-bottom: 30px;">
                    <a href="${frontendUrl}/email-verification?email=${encodedEmail}&code=${code}" target="_blank" style="background-color: #DE2C4E; color: #FFFFFF; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px;">
                      Підтвердити пошту
                    </a>
                 </td>
              </tr>
              <tr>
                <td style="color: #797171; font-size: 14px; text-align: center; opacity: 0.8;">
                  Код дійсний протягом 30 хвилин.<br>
                  Якщо ви не реєструвалися у MyTime, просто проігноруйте цей лист.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
