require("dotenv").config(); // Cargar variables de entorno desde .env

// Configuración de la base de datos
const dbConfig = {
  server: "127.0.0.1",
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    trustedConnection: process.env.DB_TRUSTED_CONNECTION === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
    encrypt: false,
    enableArithAbort: true,
  },
  connectionTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

module.exports = dbConfig;
