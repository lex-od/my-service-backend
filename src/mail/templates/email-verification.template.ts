interface EmailVerificationParams {
  code: string;
  frontendUrl: string;
  email: string;
}

export const emailVerificationTpl = ({
  code,
  frontendUrl,
  email,
}: EmailVerificationParams) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Підтвердження Email</title>
    </head>
    <body style="font-family: sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td align="center" style="padding-bottom: 20px;">
                  <h1 style="color: #333333; margin: 0; font-size: 24px;">Підтвердження реєстрації</h1>
                </td>
              </tr>
              <tr>
                <td style="color: #666666; font-size: 16px; line-height: 24px; text-align: center; padding-bottom: 30px;">
                  Ваш код підтвердження для завершення реєстрації:
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-bottom: 30px;">
                  <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 15px 30px; display: inline-block;">
                    <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000000;">${code}</span>
                  </div>
                </td>
              </tr>
              <tr>
                 <td align="center" style="padding-bottom: 30px;">
                    <a href="${frontendUrl}/email-verification?code=${code}&email=${email}" target="_blank" style="background-color: #000000; color: #ffffff; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; display: inline-block;">
                      Підтвердити пошту
                    </a>
                 </td>
              </tr>
              <tr>
                <td style="color: #999999; font-size: 14px; text-align: center;">
                  Код дійсний протягом 1 години.<br>
                  Якщо ви не запитували цей код, просто проігноруйте лист.
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
