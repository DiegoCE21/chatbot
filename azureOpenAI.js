const axios = require("axios");
require("dotenv").config();

const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const azureApiKey = process.env.AZURE_API_KEY;

/**
 * Realiza una consulta a Azure OpenAI Service.
 * @param {string} prompt - El mensaje o pregunta del usuario.
 * @param {number} maxTokens - Longitud máxima de la respuesta.
 * @param {number} temperature - Creatividad del modelo (0.0 a 1.0).
 * @returns {Promise<string>} - Respuesta del modelo GPT-4.
 */
async function askGPT(prompt, maxTokens = 500, temperature = 0.7) {
  try {
    const response = await axios.post(
      azureEndpoint,
      {
        messages: [
          {
            role: "system",
            content: `Eres un asistente útil y amigable de la empresa PedalPower Cycles, todo lo que se te pregunte lo haras como agluien de la empresa, si se te pregunta algo sobre una tienda diferente responderas que nuestra empresa es power cycles. Responderás dudas a los usuarios acerca de nuestros productos, las categorías y subcategorías de los mismos, así como nuestras ubicaciones. PedalPower Cycles es una tienda especializada en bicicletas, componentes, ropa y accesorios para ciclistas de todos los niveles. Ofrecemos productos de alta calidad como bicicletas de montaña, carretera y touring, así como componentes y accesorios esenciales para ciclistas. Con presencia en Estados Unidos, Canadá, Europa y Australia, PedalPower Cycles está comprometido en ofrecer el mejor servicio y productos a ciclistas de todo el mundo.`
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature
      },      
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": azureApiKey,
        },
      }
    );

    const reply = response.data.choices[0].message.content;
    return reply.trim();
  } catch (error) {
    console.error("Error al llamar a Azure OpenAI:", error.response?.data || error.message);
    throw new Error("No se pudo obtener una respuesta del modelo.");
  }
}

module.exports = askGPT;
