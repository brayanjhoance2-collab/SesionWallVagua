const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const enviarCodigoVerificacion = async (email, codigo, tipo) => {
  let asunto, mensaje;

  switch(tipo) {
    case 'registro':
      asunto = 'Código de verificación - Registro';
      mensaje = `Tu código de verificación es: ${codigo}. Válido por 15 minutos.`;
      break;
    case 'recuperacion_password':
      asunto = 'Código de recuperación de contraseña';
      mensaje = `Tu código de recuperación es: ${codigo}. Válido por 15 minutos.`;
      break;
    case 'cambio_password':
      asunto = 'Código de cambio de contraseña';
      mensaje = `Tu código para cambiar la contraseña es: ${codigo}. Válido por 15 minutos.`;
      break;
    default:
      asunto = 'Código de verificación';
      mensaje = `Tu código es: ${codigo}`;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: asunto,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Wallpaper App</h2>
        <p>${mensaje}</p>
        <div style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
          ${codigo}
        </div>
        <p style="color: #666;">Si no solicitaste este código, ignora este email.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error enviando email:', error);
    return false;
  }
};

module.exports = {
  enviarCodigoVerificacion
};