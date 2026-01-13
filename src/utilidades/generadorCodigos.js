const generarCodigoVerificacion = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const calcularExpiracion = (minutos = 15) => {
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() + minutos);
  return ahora;
};

module.exports = {
  generarCodigoVerificacion,
  calcularExpiracion
};