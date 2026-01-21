const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const enviarCodigoVerificacion = async (email, codigo, tipo) => {
  let asunto, mensaje;

  switch(tipo) {
    case 'registro':
      asunto = 'Código de verificación - Registro WallVagua';
      mensaje = `Tu código de verificación es: ${codigo}. Válido por 15 minutos.`;
      break;
    case 'recuperacion_password':
      asunto = 'Código de recuperación de contraseña - WallVagua';
      mensaje = `Tu código de recuperación es: ${codigo}. Válido por 15 minutos.`;
      break;
    case 'cambio_password':
      asunto = 'Código de cambio de contraseña - WallVagua';
      mensaje = `Tu código para cambiar la contraseña es: ${codigo}. Válido por 15 minutos.`;
      break;
    default:
      asunto = 'Código de verificación - WallVagua';
      mensaje = `Tu código es: ${codigo}`;
  }

  const mailOptions = {
    from: `"WallVagua App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: asunto,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #4CAF50; }
          .header h1 { color: #4CAF50; margin: 0; }
          .content { padding: 30px 20px; }
          .code-box { background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; margin: 30px 0; border-radius: 8px; letter-spacing: 5px; color: #333; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; margin-top: 30px; }
          .warning { color: #ff9800; font-size: 14px; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🖼️ WallVagua</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px; color: #333;">${mensaje}</p>
            <div class="code-box">${codigo}</div>
            <p class="warning">⚠️ Si no solicitaste este código, ignora este email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} WallVagua Corp. Todos los derechos reservados.</p>
            <p>Este es un correo automático, por favor no responder.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email enviado a ${email}`);
    return true;
  } catch (error) {
    console.error('Error enviando email:', error);
    return false;
  }
};

module.exports = {
  enviarCodigoVerificacion
};