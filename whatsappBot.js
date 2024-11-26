const { Client, LocalAuth } = require("whatsapp-web.js");
const axios = require("axios");
const qrcode = require("qrcode-terminal");

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
  
    try {
      if (/categorías|productos|qué venden/i.test(userMessage)) {
        const categorias = await sqlAdapter.getCategorias();
        if (categorias.length > 0) {
          const listaCategorias = categorias.map((cat) => `- ${cat.CategoryName}`).join("\n");
          message.reply(`Estas son nuestras categorías:\n\n${listaCategorias}`);
        } else {
          message.reply("No se encontraron categorías disponibles.");
        }
        return;
      }
  
      if (/sucursales|ubicaciones|dónde están/i.test(userMessage)) {
        const territorios = await sqlAdapter.getTerritorios();
        if (territorios.length > 0) {
          const listaTerritorios = territorios
            .map(
              (ter) =>
                `- Región: ${ter.Region}\n  País: ${ter.Country}\n  Continente: ${ter.Continent}`
            )
            .join("\n\n");
          message.reply(`Estas son nuestras ubicaciones:\n\n${listaTerritorios}`);
        } else {
          message.reply("No se encontraron ubicaciones disponibles.");
        }
        return;
      }

      const isMostExpensiveRequest = /producto más caro en (.+)/i.exec(userMessage);
      if (isMostExpensiveRequest) {
        const category = isMostExpensiveRequest[1].trim();
        const detectedCategory = detectCategory(category);
        if (detectedCategory) {
          const productoMasCaro = await sqlAdapter.getProductoMasCaro(detectedCategory);
          if (productoMasCaro) {
            message.reply(
              `El producto más caro en la categoría "${detectedCategory}" es:\n\n` +
              `${productoMasCaro.ProductName}\n` +
              `${productoMasCaro.ProductDescription}\n` +
              `Precio: $${productoMasCaro.ProductPrice}`
            );
          } else {
            message.reply(`No se encontraron productos en la categoría "${detectedCategory}".`);
          }
          return;
        }
      }
  
      const detectedSubcategory = detectSubcategory(userMessage);
      if (detectedSubcategory) {
        const productos = await sqlAdapter.getProductosPorSubcategoria(detectedSubcategory);
        if (productos.length > 0) {
          const listaProductos = productos
            .slice(0, 5) // Limitamos la respuesta a los primeros 5 productos
            .map((prod) => `${prod.ProductName} ($${prod.ProductPrice})`)
            .join("\n");
          message.reply(`Estos son algunos productos en la subcategoría "${detectedSubcategory}":\n${listaProductos}`);
        } else {
          message.reply(`No se encontraron productos en la subcategoría "${detectedSubcategory}".`);
        }
        return;
      }
  
      const category = detectCategory(userMessage);
    if (category) {
      const categoryKey = CATEGORY_KEYS[category];
      const subcategorias = await sqlAdapter.getSubcategorias(categoryKey);
      if (subcategorias.length > 0) {
        const listaSubcategorias = subcategorias
          .map((sub) => `- ${sub.SubcategoryName}`)
          .join("\n");
        message.reply(
          `Estas son las subcategorías disponibles en la categoría "${category}":\n\n${listaSubcategorias}`
        );
      } else {
        message.reply(
          `No se encontraron subcategorías en la categoría "${category}".`
        );
      }
      return;
    }

    if (/producto/i.test(userMessage)) {
      const productName = extractProductName(userMessage);
      if (productName) {
        const productInfo = await sqlAdapter.getProductInfo(productName);
        if (productInfo) {
          const respuesta = formatProductInfo(productInfo);
          message.reply(respuesta);
        } else {
          message.reply(
            `No encontré información sobre el producto "${productName}".`
          );
        }
      } else {
        message.reply("Por favor, indícame el nombre del producto.");
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