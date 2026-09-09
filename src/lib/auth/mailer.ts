import "server-only";
import nodemailer from "nodemailer";

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "Configuration SMTP incomplète (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS requis dans .env).",
    );
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendMagicLinkEmail(to: string, loginUrl: string) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await getTransport().sendMail({
    from,
    to,
    subject: "Votre lien de connexion — Suivi ICPE PENA",
    text: `Bonjour,\n\nVoici votre lien de connexion à l'application de suivi PENA (valable 15 minutes) :\n${loginUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
    html: `
      <p>Bonjour,</p>
      <p>Voici votre lien de connexion à l'application de suivi PENA (valable 15 minutes) :</p>
      <p><a href="${loginUrl}">${loginUrl}</a></p>
      <p style="color:#666;font-size:13px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
    `,
  });
}
