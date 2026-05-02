export const HTMLGenerator = {
  VERIFY_EMAIL: (name: string, token: string) => {
    const verifyUrl = `${process.env.API_URL}user/verify-email?token=${encodeURIComponent(token)}`;
    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Verify Your Email</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
      <tr>
        <td align="center">
          <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:30px;">
            
            <!-- Header -->
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <h2 style="margin:0; color:#333;">Verify Your Email</h2>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="color:#555; font-size:16px; line-height:1.5;">
                <p>Hi ${name},</p>
                <p>
                  Thanks for signing up! Please confirm your email address by clicking the button below.
                </p>
              </td>
            </tr>

            <!-- Button -->
            <tr>
              <td align="center" style="padding:25px 0;">
                <a href="${verifyUrl}" 
                   style="background-color:#4CAF50; color:#ffffff; text-decoration:none; padding:12px 25px; border-radius:5px; font-size:16px; display:inline-block;">
                  Verify Email
                </a>
              </td>
            </tr>

            <!-- Fallback link -->
            <tr>
              <td style="font-size:14px; color:#777;">
                <p>If the button doesn’t work, copy and paste this link into your browser:</p>
                <p style="word-break:break-all;">
                  <a href="${verifyUrl}" style="color:#4CAF50;">${verifyUrl}</a>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding-top:20px; font-size:12px; color:#aaa; text-align:center;">
                <p>If you didn’t create an account, you can safely ignore this email.</p>
                <p>&copy; ${new Date().getFullYear()} Your Company</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
  },
};
