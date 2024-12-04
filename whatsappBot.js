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


//   try {
//     // Consultar si el usuario existe en la base de datos
//     let userPreferences = await sqlAdapter.getUserPreferences(userID);

//     // Crear una cadena de texto a partir de los arreglos
//     const categoriesText = CATEGORIES.join(", ");
//     const subcategoriesText = SUBCATEGORIES.join(", ");

//     if (!userPreferences) {
//         await sqlAdapter.saveUserInteraction(userID);
//         const prompt = `
//         Un nuevo usuario ha interactuado por primera vez. Redacta una respuesta amigable que le dé la bienvenida y le informe sobre los servicios de PedalPower Cycles. Menciona nuestras categorías de productos: ${categoriesText}. También puedes incluir subcategorías como ${subcategoriesText}. Limita la respuesta a 50 palabras y evita hacer preguntas directas. Sé breve y entusiasta, invitando al usuario a compartir información si lo desea.
//         `;
//         const aiResponse = await askGPT(prompt);
//         message.reply(aiResponse);
//     } else {
//         // Usuario registrado: Verificar datos faltantes
//         const missingData = [];
//         if (!userPreferences.UserAge) missingData.push("su edad");
//         if (userPreferences.HasChildren === null) missingData.push("si tiene hijos");
//         if (userPreferences.HasBicycle === null) missingData.push("si tiene bicicleta");

//         if (missingData.length > 0) {
//             const prompt = `
//             Un usuario registrado ha interactuado nuevamente, pero faltan datos clave: ${missingData.join(", ")}. Redacta una respuesta amigable y natural que los anime a compartir esta información indirectamente. También menciona que contamos con una amplia gama de productos como ${categoriesText}, con subcategorías como ${subcategoriesText}. Limita la respuesta a 30 palabras. Evita preguntas directas y utiliza un enfoque conversacional.
//             `;
//             const aiResponse = await askGPT(prompt);
//             message.reply(aiResponse);
//         }
//     }
// } catch (error) {
//     console.error("Error al procesar la solicitud:", error);
//     return;
// }

  


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



  
      if (/sucursales|ubicaciones|dónde están/i.test(userMessage)) {
        try {
          // Consultar las ubicaciones desde la base de datos
          const territorios = await sqlAdapter.getTerritorios();
      
          let prompt;
      
          if (territorios && territorios.length > 0) {
            const listaTerritorios = territorios
              .map((ter) => `- Región: ${ter.Region}, País: ${ter.Country}, Continente: ${ter.Continent}`)
              .join("\n");
            prompt = `Un usuario está preguntando por nuestras ubicaciones. Estas son nuestras ubicaciones disponibles:\n\n${listaTerritorios}\n\nResponde de forma breve pero informativa, no podemos dar mas informacion de los lugares asi que solo menciona esto al usuario`;
          } else {
            prompt = `Un usuario está preguntando por nuestras ubicaciones, pero actualmente no hay ubicaciones disponibles en la base de datos. Responde de manera amigable, ofreciendo ayuda adicional si es necesario.`;
          }
      
          // Consultar OpenAI con el mensaje generado
          const aiResponse = await askGPT(prompt);
      
          // Responder al usuario con el resultado de OpenAI
          message.reply(aiResponse);
        } catch (error) {
          console.error("Error al procesar la solicitud de ubicaciones:", error);
      
          // Respuesta de error
          const aiResponse = await askGPT(
            "Hubo un error técnico al procesar la solicitud de un usuario sobre nuestras ubicaciones. Genera una respuesta breve y amigable disculpándote y ofreciendo ayuda adicional."
          );
      
          message.reply(aiResponse);
        }
      
        return;
      }




      const isMostExpensiveRequest = /producto más caro en (.+)/i.exec(userMessage);
      if (isMostExpensiveRequest) {
        try {
          // Extraer y detectar la categoría
          const category = isMostExpensiveRequest[1].trim();
          const detectedCategory = detectCategory(category);

          if (detectedCategory) {
            // Consultar el producto más caro en la base de datos
            const productoMasCaro = await sqlAdapter.getProductoMasCaro(detectedCategory);

            let prompt;
            if (productoMasCaro) {
              prompt = `Un usuario está preguntando por el producto más caro en la categoría "${detectedCategory}". El producto es:\n\n` +
                `- Nombre: ${productoMasCaro.ProductName}\n` +
                `- Descripción: ${productoMasCaro.ProductDescription}\n` +
                `- Precio: $${productoMasCaro.ProductPrice}\n\n` +
                `Genera una respuesta breve, informativa y con un máximo de 40 palabras.`;
            } else {
              prompt = `Un usuario preguntó por el producto más caro en la categoría "${detectedCategory}", pero no hay productos disponibles. Genera una respuesta breve, amable y con un máximo de 40 palabras.`;
            }

            // Consultar OpenAI con el prompt generado
            const aiResponse = await askGPT(prompt);

            // Responder al usuario
            message.reply(aiResponse);
          } else {
            const aiResponse = await askGPT(
              `Un usuario preguntó por el producto más caro en una categoría desconocida (${category}). Responde brevemente (máximo 40 palabras) explicando que no reconocemos la categoría y ofreciendo ayuda adicional.`
            );
            message.reply(aiResponse);
          }
        } catch (error) {
          console.error("Error al procesar la solicitud del producto más caro:", error);

          // Mensaje de error
          const aiResponse = await askGPT(
            "Hubo un problema técnico mientras procesábamos la solicitud del usuario sobre el producto más caro. Genera una respuesta breve (máximo 40 palabras) disculpándote y ofreciendo ayuda adicional."
          );
          message.reply(aiResponse);
        }

        return;
}




  
      
const detectedSubcategory = detectSubcategory(userMessage);
if (detectedSubcategory) {
  try {
    // Consultar productos en la subcategoría detectada
    const productos = await sqlAdapter.getProductosPorSubcategoria(detectedSubcategory);

    let prompt;
    if (productos.length > 0) {
      // Crear una lista breve de los primeros 5 productos
      const listaProductos = productos
        .slice(0, 5)
        .map((prod) => `${prod.ProductName} ($${prod.ProductPrice})`)
        .join("\n");

      prompt = `Un usuario preguntó por productos en la subcategoría "${detectedSubcategory}". Los primeros 5 productos son:\n\n` +
        `${listaProductos}\n\n` +
        `Genera una respuesta breve, informativa y con un máximo de 400 palabras, mencionalas en forma de lista y con una descripcion de cada bicicleta (maximo 30 palabras por descripcion).`;

      // Guardar la interacción del usuario
      await sqlAdapter.saveUserInteraction(
        userID,             // Número de usuario
        null,                 // Categoría
        detectedSubcategory, // Subcategoría
        userMessage,        // Mensaje original
        null,                 // Edad
        null,                 // Tiene hijos
        null,                 // Tiene bicicleta
        null                  // Número de hijos
      );
    } else {
      prompt = `Un usuario preguntó por productos en la subcategoría "${detectedSubcategory}", pero no se encontraron productos disponibles. Genera una respuesta breve y amable de máximo 40 palabras.`;
    }

    // Obtener respuesta de OpenAI
    const aiResponse = await askGPT(prompt);

    // Responder al usuario
    message.reply(aiResponse);
  } catch (error) {
    console.error("Error al procesar la solicitud de productos por subcategoría:", error);

    // Mensaje de error
    const aiResponse = await askGPT(
      "Hubo un problema técnico mientras procesábamos la solicitud del usuario sobre productos en una subcategoría. Genera una respuesta breve (máximo 40 palabras) disculpándote y ofreciendo ayuda adicional."
    );
    message.reply(aiResponse);
  }

  return;
}




  


const category = detectCategory(userMessage);
if (category) {
  try {
    const categoryKey = CATEGORY_KEYS[category];
    const subcategorias = await sqlAdapter.getSubcategorias(categoryKey);

    let prompt;
    if (subcategorias.length > 0) {
      // Crear una lista de subcategorías
      const listaSubcategorias = subcategorias
        .map((sub) => `- ${sub.SubcategoryName}`)
        .join("\n");

      prompt = `Un usuario preguntó por las subcategorías en la categoría "${category}". Estas son las subcategorías disponibles:\n\n${listaSubcategorias}\n\nGenera una respuesta breve, informativa y con un máximo de 400 palabras, en forma de lista, cada subcategoria con una descripcion de maximo 30 palabras.`;

      // Guardar la interacción del usuario
      await sqlAdapter.saveUserInteraction(
        userID,        // Número de usuario
        category,      // Categoría
        null,            // Subcategoría
        userMessage,   // Mensaje original
        null,            // Edad
        null,            // Tiene hijos
        null,            // Tiene bicicleta
        null             // Número de hijos
      );
    } else {
      prompt = `Un usuario preguntó por las subcategorías en la categoría "${category}", pero no se encontraron subcategorías disponibles. Genera una respuesta breve y amable de máximo 40 palabras.`;
    }

    // Obtener respuesta de OpenAI
    const aiResponse = await askGPT(prompt);

    // Responder al usuario
    message.reply(aiResponse);
  } catch (error) {
    console.error("Error al procesar la solicitud de subcategorías:", error);

    // Mensaje de error
    const aiResponse = await askGPT(
      "Hubo un problema técnico mientras procesábamos la solicitud del usuario sobre las subcategorías. Genera una respuesta breve (máximo 40 palabras) disculpándote y ofreciendo ayuda adicional."
    );
    message.reply(aiResponse);
  }

  return;
}








if (/producto/i.test(userMessage)) {
  try {
    const productName = extractProductName(userMessage);

    if (productName) {
      const productInfo = await sqlAdapter.getProductInfo(productName);

      if (productInfo) {
        // Crear un prompt para OpenAI
        const prompt = `Un usuario preguntó por el producto "${productName}". Aquí está la información del producto:\n\n` +
          `Nombre: ${productInfo.ProductName}\n` +
          `Descripción: ${productInfo.ProductDescription}\n` +
          `Precio: $${productInfo.ProductPrice}\n\n` +
          `Genera una respuesta breve, clara y de máximo 40 palabras para el usuario, destacando las características clave.`;

        // Obtener respuesta de OpenAI
        const aiResponse = await askGPT(prompt);
        message.reply(aiResponse);
      } else {
        // Prompt para productos no encontrados
        const prompt = `Un usuario preguntó por el producto "${productName}", pero no se encontró información. Genera una respuesta breve (máximo 40 palabras) que sea amable e invite al usuario a buscar otros productos.`;
        const aiResponse = await askGPT(prompt);
        message.reply(aiResponse);
      }
    } else {
      // Prompt para casos donde no se especifica un producto
      const prompt = `Un usuario pidió información de un producto, pero no especificó el nombre. Genera una respuesta breve (máximo 40 palabras) que invite al usuario a proporcionar más detalles.`;
      const aiResponse = await askGPT(prompt);
      message.reply(aiResponse);
    }
  } catch (error) {
    console.error("Error al procesar la solicitud del producto:", error);

    // Prompt para errores técnicos
    const aiResponse = await askGPT(
      "Hubo un problema técnico mientras procesábamos la solicitud de un producto. Genera una respuesta breve (máximo 40 palabras) disculpándote y ofreciendo ayuda adicional."
    );
    message.reply(aiResponse);
  }

  return;
}


    
if (/tengo hijos/i.test(userMessage)) {
  try {
    // Obtener productos por subcategorías específicas
    const roadBikes = await sqlAdapter.getProductosPorSubcategoria("Road Bikes");
    const mountainBikes = await sqlAdapter.getProductosPorSubcategoria("Mountain Bikes");

    // Función para formatear productos de forma breve
    const formatProductos = (productos) =>
      productos
        .slice(0, 5) // Limitamos a los primeros 5 productos
        .map(
          (prod) =>
            `- ${prod.ProductName} (Modelo: ${prod.ProductStyle || "N/A"}, Precio: $${prod.ProductPrice.toFixed(2)})`
        )
        .join("\n");

    // Prompt dinámico para OpenAI con datos obtenidos
    const prompt = `
      Un usuario mencionó que tiene hijos y estamos sugiriendo bicicletas.
      
      🚴 **Road Bikes**:
      ${roadBikes.length > 0 ? formatProductos(roadBikes) : "No se encontraron modelos disponibles."}

      🚵 **Mountain Bikes**:
      ${mountainBikes.length > 0 ? formatProductos(mountainBikes) : "No se encontraron modelos disponibles."}

      Genera una respuesta breve y amable mencionando al usuario estas opciones (maximo 25 preguntas por descripcion de producto, la descripcion no considera el precio ni nombre, menciona las bicis en forma de lista y de forma atractiva).
    `;

    // Obtener respuesta de OpenAI
    const aiResponse = await askGPT(prompt);

    message.reply(aiResponse);

    // Guardar interacción del usuario
    await sqlAdapter.saveUserInteraction(
      userID,
      category,
      null,
      userMessage,
      null, // Edad
      "Sí", // Tiene hijos
      null, // Tiene bicicleta
      null // Número de hijos
    );
  } catch (error) {
    console.error("Error al procesar productos para usuarios con hijos:", error);

    // Respuesta en caso de error técnico
    const aiResponse = await askGPT(
      "Hubo un problema al procesar una solicitud para usuarios con hijos. Genera una respuesta breve y amable disculpándote e invitando al usuario a volver a intentarlo."
    );
    message.reply(aiResponse);
  }
  return;
}




if (/ya tengo una bici|compré una bici|tengo bicicleta|necesito accesorios/i.test(userMessage)) {
  try {
    // Obtener accesorios de la subcategoría "4"
    const accesorios = await sqlAdapter.getProductosPorSubcategoriakey("4");

    // Formatear los accesorios obtenidos
    const formatAccesorios = (productos) =>
      productos
        .slice(0, 5) // Limita a los primeros 5 productos
        .map((acc) => `- ${acc.ProductName} ($${acc.ProductPrice.toFixed(2)})`)
        .join("\n");

    if (accesorios.length > 0) {
      const listaAccesorios = formatAccesorios(accesorios);

      // Prompt dinámico para generar una respuesta breve y útil
      const prompt = `
        Un usuario mencionó que ya tiene una bicicleta y está buscando accesorios.
        Estos son algunos productos disponibles:
        ${listaAccesorios}
        
        Genera una respuesta breve, amigable y que invite al usuario a adquirir nuestros accesorios, mencionalos en forma de lista y de forma atractiva.
      `;

      const aiResponse = await askGPT(prompt);
      message.reply(aiResponse);
    } else {
      const aiResponse = await askGPT(
        "Un usuario busca accesorios para bicicleta, pero no hay productos disponibles. Genera una respuesta breve disculpándote y sugiriendo explorar otras categorías o intentar más tarde."
      );
      message.reply(aiResponse);
    }

    // Guardar interacción del usuario
    await sqlAdapter.saveUserInteraction(
      userID,
      "Accessories",
      null,
      userMessage,
      null, // Edad
      null, // Tiene hijos
      "Sí", // Tiene bicicleta
      null // Número de hijos
    );
  } catch (error) {
    console.error("Error al procesar la solicitud de accesorios:", error);

    // Respuesta en caso de error técnico
    const aiResponse = await askGPT(
      "Hubo un problema técnico al procesar una solicitud de accesorios para bicicleta. Genera una respuesta breve y amigable disculpándote."
    );
    message.reply(aiResponse);
  }
  return;
}





    if (/no tengo bici/i.test(userMessage)) {
      // Consultar bicicletas disponibles
      const bicicletas = await sqlAdapter.getProductosPorSubcategoria("Mountain Bikes");
      const bicicletasExtras = await sqlAdapter.getProductosPorSubcategoria("Road Bikes");

      // Combinar resultados
      const todasLasBicis = [...bicicletas, ...bicicletasExtras];

      if (todasLasBicis.length > 0) {
        const listaBicis = todasLasBicis
          .slice(0, 5) // Limita la respuesta a los primeros 5 productos
          .map((bike) => `${bike.ProductName} - $${bike.ProductPrice.toFixed(2)}`)
          .join("\n");
        message.reply(
          `¡No te preocupes! Aquí tienes algunas opciones de bicicletas disponibles:\n\n${listaBicis}`
        );
      } else {
        message.reply(
          "No encontré bicicletas disponibles en este momento. Intenta más tarde o pregunta por otras categorías."
        );
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