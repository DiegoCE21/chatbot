const { Client, LocalAuth } = require("whatsapp-web.js");
const axios = require("axios");
const qrcode = require("qrcode-terminal");
const sqlAdapter = require('./sqlAdapter'); // Módulo para manejar la base de datos

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_API_KEY = process.env.AZURE_API_KEY;

const CATEGORIES = [
  "Bikes",
  "Components",
  "Clothing",
  "Accessories",
];

const CATEGORY_KEYS = {
  Bikes: 1, 
  Components: 2,
  Clothing: 3,
  Accessories: 4,
};


const SUBCATEGORIES = [
  "Mountain Bikes", "Road Bikes", "Touring Bikes", "Handlebars", "Bottom Brackets", "Brakes",
  "Chains", "Cranksets", "Derailleurs", "Forks", "Headsets", "Mountain Frames", "Pedals",
  "Road Frames", "Saddles", "Touring Frames", "Wheels", "Bib-Shorts", "Caps", "Gloves",
  "Jerseys", "Shorts", "Socks", "Tights", "Vests", "Bike Racks", "Bike Stands",
  "Bottles and Cages", "Cleaners", "Fenders", "Helmets", "Hydration Packs", "Lights",
  "Locks", "Panniers", "Pumps", "Tires and Tubes",
];

async function askGPT(prompt) {
  try {
    const response = await axios.post(
      AZURE_OPENAI_ENDPOINT,
      {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      },
      {
        headers: {
          "api-key": AZURE_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error en Azure OpenAI:", error.response?.data || error.message);
    return "Lo siento, hubo un problema al procesar tu solicitud.";
  }
}

function detectCategory(userMessage) {
  return CATEGORIES.find((category) =>
    userMessage.toLowerCase().includes(category.toLowerCase())
  );
}

function detectSubcategory(userMessage) {
  return SUBCATEGORIES.find((subcategory) =>
    userMessage.toLowerCase().includes(subcategory.toLowerCase())
  );
}

function extractProductName(message) {
  const match = message.match(/producto\s(.+)/i);
  return match ? match[1].trim() : null;
}

function formatProductInfo(product) {
  return `
  Información del producto:
  - Nombre: ${product.ProductName}
  - Modelo: ${product.ModelName || "N/A"}
  - Descripción: ${product.ProductDescription || "N/A"}
  - Color: ${product.ProductColor || "N/A"}
  - Tamaño: ${product.ProductSize || "N/A"}
  - Estilo: ${product.ProductStyle || "N/A"}
  - Precio: $${product.ProductPrice.toFixed(2)} MXN
  `;
}


function extractUserInfo(message) {
  const userInfo = {};

  // Detectar edad
  const ageMatch = message.match(/\b\d{1,2}\b años/);
  if (ageMatch) {
      userInfo.userAge = parseInt(ageMatch[0]);
  }

  // Detectar si tiene hijos
  if (/tengo hijos|soy padre|soy madre/i.test(message)) {
      userInfo.hasChildren = true;
  } else if (/no tengo hijos/i.test(message)) {
      userInfo.hasChildren = false;
  }

  // Detectar si tiene bicicleta
  if (/tengo bicicleta/i.test(message)) {
      userInfo.hasBicycle = true;
  } else if (/no tengo bicicleta/i.test(message)) {
      userInfo.hasBicycle = false;
  }

  // Detectar número de hijos
  const childrenMatch = message.match(/\b\d{1,2}\b hijos/);
  if (childrenMatch) {
      userInfo.numberOfChildren = parseInt(childrenMatch[0]);
  }

  return userInfo;
}





function initializeWhatsAppBot(sqlAdapter) {
    const client = new Client();
    
    client.on("qr", (qr) => {
      console.log("Escanea este código QR con tu teléfono:");
      qrcode.generate(qr, { small: true });
    });
  
    client.on("ready", () => {
      console.log("Cliente de WhatsApp listo.");
    });


  client.on("message", async (message) => {
    console.log(`Mensaje recibido: ${message.body}`);
    const userMessage = message.body.trim();
    const userID = message.from;


   try {
    // Consultar si el usuario existe en la base de datos
    let userPreferences = await sqlAdapter.getUserPreferences(userID);

    // Crear una cadena de texto a partir de los arreglos
    const categoriesText = CATEGORIES.join(", ");
    const subcategoriesText = SUBCATEGORIES.join(", ");

    if (!userPreferences) {
        await sqlAdapter.saveUserInteraction(userID);
        const prompt = `
        Un nuevo usuario ha interactuado por primera vez. Redacta una respuesta amigable que le dé la bienvenida y le informe sobre los servicios de PedalPower Cycles. Menciona nuestras categorías de productos: ${categoriesText}. También puedes incluir subcategorías como ${subcategoriesText}. Limita la respuesta a 50 palabras y evita hacer preguntas directas. Sé breve y entusiasta, invitando al usuario a compartir información si lo desea.
        `;
        const aiResponse = await askGPT(prompt);
        message.reply(aiResponse);
    } else {
        // Usuario registrado: Verificar datos faltantes
        const missingData = [];
        if (!userPreferences.UserAge) missingData.push("su edad");
        if (userPreferences.HasChildren === null) missingData.push("si tiene hijos");
        if (userPreferences.HasBicycle === null) missingData.push("si tiene bicicleta");

        if (missingData.length > 0) {
            const prompt = `
            Un usuario registrado ha interactuado nuevamente, pero faltan datos clave: ${missingData.join(", ")}. Redacta una respuesta amigable y natural que los anime a compartir esta información indirectamente. También menciona que contamos con una amplia gama de productos como ${categoriesText}, con subcategorías como ${subcategoriesText}. Limita la respuesta a 30 palabras. Evita preguntas directas y utiliza un enfoque conversacional.
            `;
            const aiResponse = await askGPT(prompt);
            message.reply(aiResponse);
        }
    }
} catch (error) {
    console.error("Error al procesar la solicitud:", error);
    return;
}

  


    try {
      if (/categorías|productos|qué venden|ofrecen/i.test(userMessage)) {
        try {
          // Consultar las categorías desde la base de datos
          const categorias = await sqlAdapter.getCategorias();
      
          let prompt;
      
          if (categorias && categorias.length > 0) {
            const listaCategorias = categorias.map((cat) => `- ${cat.CategoryName}`).join("\n");
            prompt = `Un usuario está preguntando sobre nuestras categorías de productos. Estas son nuestras categorías actuales:\n\n${listaCategorias}\n\nResponde de manera amigable y detallada, invitándolos a explorar más sobre los productos, limita el mensaje a maximo 120 palabras.`;
          } else {
            prompt = `Un usuario está preguntando sobre nuestras categorías de productos, pero actualmente no hay ninguna categoría disponible en la base de datos. Genera una respuesta empática que mencione que no hay categorías disponibles, pero ofrezca ayuda para resolver cualquier otra consulta.`;
          }
      
          // Consultar OpenAI con el mensaje generado
          const aiResponse = await askGPT(prompt);
      
          // Responder al usuario con el resultado de OpenAI
          message.reply(aiResponse);
        } catch (error) {
          console.error("Error al procesar la solicitud:", error);
      
          // Respuesta de error
          const aiResponse = await askGPT(
            "Hubo un error técnico al procesar la solicitud de un usuario sobre nuestras categorías de productos. Genera una respuesta disculpándote y ofreciendo ayuda adicional."
          );
      
          message.reply(aiResponse);
        }
      
        return;
      }
   
   
    if (/tengo más de 50 años de edad/i.test(userMessage)) {
      const bikeRacks = await sqlAdapter.getProductosPorSubcategoria("Bike Racks");

      if (bikeRacks.length > 0) {
        const listaBikeRacks = bikeRacks
          .slice(0, 5) // Limita la respuesta a los primeros 5 productos
          .map((rack) => `${rack.ProductName} - $${rack.ProductPrice.toFixed(2)}`)
          .join("\n");
        message.reply(
          `¡Gracias por compartirlo! Aquí tienes algunas opciones de portabicicletas (Bike Racks) disponibles:\n\n${listaBikeRacks}`
        );
      } else {
        message.reply(
          "No encontré portabicicletas disponibles en este momento. Intenta más tarde o pregunta por otras categorías."
        );
      }
      return;
    }    
      const respuesta = await askGPT(userMessage);
      message.reply(respuesta);
    } catch (error) {
      console.error("Error al procesar el mensaje:", error);
      message.reply("Lo siento, ocurrió un error al procesar tu solicitud. Inténtalo nuevamente.");
    }
  });
  
  client.initialize();
}

module.exports = initializeWhatsAppBot;