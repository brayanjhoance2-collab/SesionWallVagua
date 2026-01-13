require('dotenv').config();
const app = require('./src/app');
const { PORT } = require('./src/config/servidor');

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV}`);
});