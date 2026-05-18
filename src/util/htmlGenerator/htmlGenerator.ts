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
                   style="background-color:#0089d3; color:#ffffff; text-decoration:none; padding:12px 25px; border-radius:5px; font-size:16px; display:inline-block;">
                  Verify Email
                </a>
              </td>
            </tr>

            <!-- Fallback link -->
            <tr>
              <td style="font-size:14px; color:#777;">
                <p>If the button doesn’t work, copy and paste this link into your browser:</p>
                <p style="word-break:break-all;">
                  <a href="${verifyUrl}" style="color:#0089d3;">${verifyUrl}</a>
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

  ORDER_CREATED: (name: string, orderId: number) => {
    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Order Confirmation</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
      <tr>
        <td align="center">
          <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:30px;">

            <!-- Header -->
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <h2 style="margin:0; color:#333;">
                  Your Order Has Been Placed
                </h2>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="color:#555; font-size:16px; line-height:1.5;">
                <p>Hi ${name},</p>

                <p>
                  Thank you for your order! Your order has been successfully placed
                  and is now being processed.
                </p>

                <p>
                  <strong>Order ID:</strong> #${orderId}
                </p>

                <p>
                  We’ll notify you once your order status changes.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding-top:20px; font-size:12px; color:#aaa; text-align:center;">
                <p>Thank you for shopping with us.</p>
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
  ORDER_CONFIRMED: (name: string, orderId: number) => {
    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Order Confirmed</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
      <tr>
        <td align="center">
          <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:30px;">
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <h2 style="margin:0; color:#333;">
                  Your Order Has Been Confirmed
                </h2>
              </td>
            </tr>

            <tr>
              <td style="color:#555; font-size:16px; line-height:1.5;">
                <p>Hi ${name},</p>

                <p>
                  Your order has been confirmed and is being prepared.
                </p>

                <p>
                  <strong>Order ID:</strong> #${orderId}
                </p>

                <p>
                  We will notify you when it ships.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding-top:20px; font-size:12px; color:#aaa; text-align:center;">
                <p>Thank you for shopping with us.</p>
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
  ORDER_CANCELLED: (name: string, orderId: number) => {
    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Order Cancelled</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
      <tr>
        <td align="center">
          <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:30px;">

            <!-- Header -->
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <h2 style="margin:0; color:#d32f2f;">
                  Your Order Has Been Cancelled
                </h2>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="color:#555; font-size:16px; line-height:1.5;">
                <p>Hi ${name},</p>

                <p>
                  Your order has been cancelled successfully.
                </p>

                <p>
                  <strong>Order ID:</strong> #${orderId}
                </p>

                <p>
                  If you believe this was a mistake or have any questions,
                  please contact our support team.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding-top:20px; font-size:12px; color:#aaa; text-align:center;">
                <p>We hope to serve you again soon.</p>
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
  ORDER_SHIPPED: (name: string, orderId: number) => {
    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Order Shipped</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
      <tr>
        <td align="center">
          <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:30px;">

            <!-- Header -->
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <h2 style="margin:0; color:#333;">
                  Your Order Has Been Shipped
                </h2>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="color:#555; font-size:16px; line-height:1.5;">
                <p>Hi ${name},</p>

                <p>
                  Great news! Your order is now on its way.
                </p>

                <p>
                  <strong>Order ID:</strong> #${orderId}
                </p>

                <p>
                  Your package has been shipped and should arrive soon.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding-top:20px; font-size:12px; color:#aaa; text-align:center;">
                <p>Thank you for shopping with us.</p>
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
  ORDER_DELIVERED: (name: string, orderId: number) => {
    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Order Delivered</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
      <tr>
        <td align="center">
          <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:30px;">

            <!-- Header -->
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <h2 style="margin:0; color:#2e7d32;">
                  Your Order Has Been Delivered
                </h2>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="color:#555; font-size:16px; line-height:1.5;">
                <p>Hi ${name},</p>

                <p>
                  Your order has been successfully delivered.
                </p>

                <p>
                  <strong>Order ID:</strong> #${orderId}
                </p>

                <p>
                  We hope you enjoy your purchase and thank you for choosing us.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding-top:20px; font-size:12px; color:#aaa; text-align:center;">
                <p>We appreciate your support.</p>
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
