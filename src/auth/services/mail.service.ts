import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

const MODO_PRUEBAS = true;
const CORREO_PRUEBAS = 'larajhonatanv@gmail.com';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend;
  private from: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.from = this.config.get<string>('MAIL_FROM', 'onboarding@resend.dev');
    this.logger.log(`Servicio de correo inicializado — modo pruebas: ${MODO_PRUEBAS}`);
  }

  private resolverDestinatario(destinatario: string): string {
    return MODO_PRUEBAS ? CORREO_PRUEBAS : destinatario;
  }

  async enviarOtp(destinatario: string, razonSocial: string, codigo: string): Promise<void> {
    const to = this.resolverDestinatario(destinatario);

    await this.resend.emails.send({
      from: this.from,
      to,
      subject: `${codigo} es tu código de verificación — Zifcor`,
      html: this.templateOtp(razonSocial, codigo),
      text: `Tu código de verificación Zifcor es: ${codigo}\n\nVigente por 10 minutos. No lo compartas con nadie.`,
    });

    this.logger.debug(`OTP enviado a: ${to}${MODO_PRUEBAS ? ` (real: ${destinatario})` : ''}`);
  }

  async enviarBienvenida(destinatario: string, razonSocial: string): Promise<void> {
    const to = this.resolverDestinatario(destinatario);

    await this.resend.emails.send({
      from: this.from,
      to,
      subject: `¡Bienvenido a Zifcor, ${razonSocial}!`,
      html: this.templateBienvenida(razonSocial),
      text: `¡Hola ${razonSocial}! Tu cuenta empresarial en Zifcor ha sido creada exitosamente.`,
    });

    this.logger.debug(`Bienvenida enviada a: ${to}${MODO_PRUEBAS ? ` (real: ${destinatario})` : ''}`);
  }

  async enviarRecuperacion(destinatario: string, razonSocial: string, resetLink: string): Promise<void> {
    const to = this.resolverDestinatario(destinatario);

    await this.resend.emails.send({
      from: this.from,
      to,
      subject: `Recupera tu contraseña — Zifcor`,
      html: this.templateRecuperacion(razonSocial, resetLink),
      text: `Solicitaste recuperar tu contraseña de Zifcor. Ingresa a este enlace para crear una nueva: ${resetLink}\n\nVigente por 30 minutos. Si no lo solicitaste, ignora este correo.`,
    });

    this.logger.debug(`Recuperación de contraseña enviada a: ${to}${MODO_PRUEBAS ? ` (real: ${destinatario})` : ''}`);
  }

  private templateOtp(razonSocial: string, codigo: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Código de verificación</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid rgba(0,0,0,.07);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#0071e3,#1a87ff);padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Zifcor</p>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.75);font-weight:600;">Portal Empresarial</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px;">
              <p style="margin:0 0 6px;font-size:15px;color:#0b1220;font-weight:600;">
                Hola, <strong>${razonSocial}</strong>
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:rgba(11,18,32,.6);line-height:1.6;">
                Tu código de verificación para completar el registro empresarial es:
              </p>
              <div style="background:#f4f6fb;border:1.5px solid rgba(0,113,227,.15);border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0;font-size:48px;font-weight:900;letter-spacing:16px;color:#0071e3;font-variant-numeric:tabular-nums;">
                  ${codigo}
                </p>
              </div>
              <p style="margin:0 0 24px;font-size:13px;color:rgba(11,18,32,.5);text-align:center;line-height:1.6;">
                ⏱ Vigente por <strong>10 minutos</strong>. No lo compartas con nadie.
              </p>
              <hr style="border:none;border-top:1px solid rgba(0,0,0,.07);margin:0 0 20px;"/>
              <p style="margin:0;font-size:12px;color:rgba(11,18,32,.38);line-height:1.6;">
                Si no solicitaste este código, ignora este correo. Tu cuenta permanece segura.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f7f8fb;padding:16px 32px;border-top:1px solid rgba(0,0,0,.06);">
              <p style="margin:0;font-size:11.5px;color:rgba(11,18,32,.38);text-align:center;">
                © ${new Date().getFullYear()} Zifcor · Portal Empresarial Colombia
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private templateRecuperacion(razonSocial: string, resetLink: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Recupera tu contraseña</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid rgba(0,0,0,.07);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#0071e3,#1a87ff);padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Zifcor</p>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.75);font-weight:600;">Portal Empresarial</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px;">
              <p style="margin:0 0 6px;font-size:15px;color:#0b1220;font-weight:600;">
                Hola, <strong>${razonSocial}</strong>
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:rgba(11,18,32,.6);line-height:1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta empresarial. Haz clic en el siguiente botón para crear una nueva:
              </p>
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${resetLink}" style="display:inline-block;background:#0071e3;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:10px;">
                  Restablecer contraseña
                </a>
              </div>
              <p style="margin:0 0 24px;font-size:13px;color:rgba(11,18,32,.5);text-align:center;line-height:1.6;">
                ⏱ Este enlace es válido por <strong>30 minutos</strong>.
              </p>
              <hr style="border:none;border-top:1px solid rgba(0,0,0,.07);margin:0 0 20px;"/>
              <p style="margin:0;font-size:12px;color:rgba(11,18,32,.38);line-height:1.6;">
                Si no solicitaste este cambio, ignora este correo. Tu contraseña actual seguirá funcionando.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f7f8fb;padding:16px 32px;border-top:1px solid rgba(0,0,0,.06);">
              <p style="margin:0;font-size:11.5px;color:rgba(11,18,32,.38);text-align:center;">
                © ${new Date().getFullYear()} Zifcor · Portal Empresarial Colombia
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private templateBienvenida(razonSocial: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Bienvenido a Zifcor</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,.07);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#0071e3,#1a87ff);padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:900;color:#fff;">Zifcor</p>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.75);font-weight:600;">Portal Empresarial</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px;">
              <div style="width:60px;height:60px;background:rgba(22,163,74,.1);border:2px solid rgba(22,163,74,.25);border-radius:15px;margin:0 auto 24px;text-align:center;line-height:60px;font-size:28px;">✅</div>
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#0b1220;text-align:center;letter-spacing:-.5px;">¡Cuenta creada!</h2>
              <p style="margin:0 0 24px;font-size:14px;color:rgba(11,18,32,.6);text-align:center;line-height:1.6;">
                <strong>${razonSocial}</strong> ya tiene acceso al portal empresarial Zifcor.
              </p>
              <p style="margin:0 0 8px;font-size:13px;color:rgba(11,18,32,.5);text-align:center;">Ingresa en cualquier momento desde:</p>
              <p style="margin:0 0 28px;text-align:center;">
                <a href="https://app.zifcor.co/auth" style="color:#0071e3;font-weight:700;font-size:14px;text-decoration:none;">app.zifcor.co/auth</a>
              </p>
              <hr style="border:none;border-top:1px solid rgba(0,0,0,.07);margin:0 0 20px;"/>
              <p style="margin:0;font-size:12px;color:rgba(11,18,32,.38);line-height:1.6;">
                Si no creaste esta cuenta contáctanos en <a href="mailto:soporte@zifcor.co" style="color:#0071e3;">soporte@zifcor.co</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f7f8fb;padding:16px 32px;border-top:1px solid rgba(0,0,0,.06);">
              <p style="margin:0;font-size:11.5px;color:rgba(11,18,32,.38);text-align:center;">
                © ${new Date().getFullYear()} Zifcor · Portal Empresarial Colombia
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}