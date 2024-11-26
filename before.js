/*require("dotenv").config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const SqlAdapter = require('./sqlAdapter');

console.log("Iniciando aplicación...");

// Configuración de la base de datos
const dbConfig = {
    server: '127.0.0.1',
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

// Logs para verificar la configuración
console.log("Configuración de la base de datos:", dbConfig);

const adapterDB = new SqlAdapter(dbConfig);

const client = new Client({
    authStrategy: new LocalAuth(), // Maneja la autenticación automáticamente
});

// Genera el QR para escanear
client.on('qr', (qr) => {
    console.log('QR recibido, escanea con WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Evento cuando la sesión se guarda correctamente
client.on('ready', async () => {
    console.log('Cliente conectado exitosamente.');

    // Escucha mensajes entrantes
    client.on('message', async (message) => {
        if (message.body.toLowerCase() === 'ventas') {
            message.reply('Consultando datos de ventas...');
            try {
                const ventas = await adapterDB.getVentas();
                if (ventas.length === 0) {
                    message.reply('No hay registros de ventas.');
                } else {
                    const reply = ventas.map((venta) => `ID: ${venta.id}, Total: ${venta.total}, Fecha: ${venta.fecha}`).join('\n');
                    message.reply(reply);
                }
            } catch (error) {
                console.error('Error obteniendo datos de ventas:', error);
                message.reply('Ocurrió un error al consultar los datos de ventas.');
            }
        }

        if (message.body.toLowerCase() === 'productos') {
            message.reply('Consultando datos de productos...');
            try {
                const productos = await adapterDB.getProductos();
                if (productos.length === 0) {
                    message.reply('No hay registros de productos.');
                } else {
                    const reply = productos.map((producto) => `ID: ${producto.id}, Nombre: ${producto.nombre}, Precio: ${producto.precio}`).join('\n');
                    message.reply(reply);
                }
            } catch (error) {
                console.error('Error obteniendo datos de productos:', error);
                message.reply('Ocurrió un error al consultar los datos de productos.');
            }
        }
    });
});

// Manejo de errores
client.on('auth_failure', (msg) => {
    console.error('Error de autenticación:', msg);
});

client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
});

const main = async () => {
    try {
        console.log("Conectando a la base de datos...");
        await adapterDB.connect();
        console.log("Conexión a la base de datos establecida.");

        // Inicia el cliente de WhatsApp
        client.initialize();
    } catch (error) {
        console.error("Error inicializando el bot:", error);
    }
};

main();*/