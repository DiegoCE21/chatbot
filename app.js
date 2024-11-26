require("dotenv").config(); // Cargar variables de entorno
const sql = require("mssql");
const SqlAdapter = require("./sqlAdapter"); // Declaración única
const dbConfig = require("./dbConfig");
const initializeWhatsAppBot = require("./whatsappBot");

// Configuración de la base de datos
(async function startApp() {
  try {
    console.log("Iniciando aplicación...");

    // Probar conexión a la base de datos
    const pool = await sql.connect(dbConfig);
    console.log("Conexión a la base de datos establecida correctamente.");

    // Crear instancia del adaptador SQL
    const sqlAdapter = new SqlAdapter(dbConfig);

    // Probar una consulta para verificar la funcionalidad del adaptador
    const categorias = await sqlAdapter.getCategorias();
    console.log("Categorías disponibles en la base de datos:", categorias);

    // Iniciar el bot de WhatsApp
    console.log("Inicializando bot de WhatsApp...");
    initializeWhatsAppBot(sqlAdapter);

    console.log("Aplicación iniciada correctamente.");
  } catch (error) {
    console.error("Error al iniciar la aplicación:", error.message);
    process.exit(1); // Salir con código de error
  }
})();
