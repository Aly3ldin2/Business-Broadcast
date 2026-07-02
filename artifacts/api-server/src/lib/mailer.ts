import nodemailer from "nodemailer";

interface MailTransport {
  transporter: nodemailer.Transporter;
  from: string;
}

function createTransport(): MailTransport | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;

  if (!host || !user || !pass || !from) return null;

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
    from,
  };
}

export function isMailConfigured(): boolean {
  return createTransport() !== null;
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<{ success: boolean; error?: string }> {
  const transport = createTransport();
  if (!transport) {
    return {
      success: false,
      error:
        "لم يتم إعداد البريد الإلكتروني — يرجى إعداد متغيرات SMTP_HOST و SMTP_USER و SMTP_PASS على الخادم",
    };
  }

  try {
    await transport.transporter.sendMail({
      from: transport.from,
      to: email,
      subject: "إعادة تعيين كلمة المرور — WhatsApp Broadcast",
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;color:#111">
          <h2 style="color:#16a34a">إعادة تعيين كلمة المرور</h2>
          <p>استخدم الكود التالي لإعادة تعيين كلمة المرور الخاصة بك:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:10px;text-align:center;
                      padding:24px;background:#f0fdf4;border:2px solid #16a34a;
                      border-radius:12px;margin:24px 0;color:#16a34a">
            ${token}
          </div>
          <p style="color:#555">هذا الكود صالح لمدة <strong>ساعة واحدة</strong> فقط.</p>
          <p style="color:#999;font-size:12px">إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذا البريد.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: `فشل إرسال البريد: ${(e as Error).message}` };
  }
}
