import { QwenLocalEngine } from './qwen_local.js';

export class AIService {
  constructor() {
    this.provider = 'local_qwen'; // 'local_qwen' | 'fallback' | 'gemini' | 'openai' | 'ollama'
    this.apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';
    this.botName = 'Aura';
    this.personalityPrompt = 'Eres Aura, la copiloto divertida, amigable y carismática del stream. Responde de forma muy natural, ingeniosa y en máximo 1 o 2 oraciones en español coloquial. Saluda al autor si hace una pregunta.';
    this.maxTokens = 60;

    // Precargar Qwen local de forma asíncrona
    setTimeout(() => {
      QwenLocalEngine.getInstance().initialize().catch(() => {});
    }, 1000);
  }

  updateConfig(config = {}) {
    if (config.botName) this.botName = config.botName;
    if (config.personalityPrompt) {
      this.personalityPrompt = config.personalityPrompt;
      QwenLocalEngine.getInstance().setPersonalityPrompt(config.personalityPrompt);
    }
    if (config.provider) this.provider = config.provider;
    if (config.apiKey !== undefined) this.apiKey = config.apiKey;
  }

  async generateResponse(author, message, platform = 'stream') {
    // 1. Motor Neuronal Local en Backend (Qwen 2.5 0.5B en Metal GPU)
    if (this.provider === 'local_qwen') {
      try {
        const qwen = QwenLocalEngine.getInstance();
        return await qwen.generate(author, message);
      } catch (err) {
        console.warn('Falla en Qwen Local, usando fallback inteligente:', err.message);
      }
    }

    // 2. Proveedores en la Nube con API Key
    if (this.provider === 'gemini' && this.apiKey) {
      try {
        return await this.callGemini(author, message);
      } catch (err) {
        console.warn('Falla en Gemini API, usando fallback inteligente:', err.message);
      }
    }

    if (this.provider === 'openai' && this.apiKey) {
      try {
        return await this.callOpenAI(author, message);
      } catch (err) {
        console.warn('Falla en OpenAI API, usando fallback inteligente:', err.message);
      }
    }

    if (this.provider === 'ollama') {
      try {
        return await this.callOllama(author, message);
      } catch (err) {
        console.warn('Falla en Ollama, usando fallback inteligente:', err.message);
      }
    }

    // 3. Fallback inteligente contextual en español sin necesidad de API Key
    return this.generateSmartFallback(author, message);
  }

  async callGemini(author, message) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const prompt = `Tu rol: ${this.personalityPrompt}.
El espectador "${author}" dijo en el chat: "${message}".
Responde como ${this.botName} en máximo 2 oraciones directas para ser leídas por voz (sin emojis ni marcas markdown).`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: this.maxTokens, temperature: 0.8 }
      })
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.statusText}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text.trim();
    throw new Error('Respuesta vacía de Gemini');
  }

  async callOpenAI(author, message) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `${this.personalityPrompt} Responde en máximo 2 oraciones para voz.` },
          { role: 'user', content: `${author} dice: "${message}"` }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.8
      })
    });

    if (!res.ok) throw new Error(`OpenAI error: ${res.statusText}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || '';
  }

  async callOllama(author, message, endpoint = 'http://localhost:11434') {
    const res = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:latest',
        prompt: `${this.personalityPrompt}\nEl espectador ${author} comenta: "${message}". Responde en 1 o 2 oraciones:`,
        stream: false
      })
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
    const data = await res.json();
    return data?.response?.trim() || '';
  }

  generateSmartFallback(author, message) {
    const cleanMsg = (message || '').toLowerCase();

    // 1. Saludos dedicados y familiares (primo, amigo, gente)
    if (cleanMsg.includes('saludo') || cleanMsg.includes('primo') || cleanMsg.includes('amigo') || cleanMsg.includes('hola') || cleanMsg.includes('buenas')) {
      const match = cleanMsg.match(/para\s+(?:mi\s+)?([a-záéíóúñ]+)/i);
      const recipient = match ? match[1] : author;
      return `¡Un saludazo enorme con todo el cariño del stream para ${recipient}! Gracias por estar aquí compartiendo el directo con nosotros.`;
    }

    // 2. Tiempo de transmisión o duración del directo
    if (cleanMsg.includes('tiempo') || cleanMsg.includes('llevas') || cleanMsg.includes('cuanto tiempo') || cleanMsg.includes('horas')) {
      return `¡Hola ${author}! Llevamos un buen rato a tope y con toda la energía, y la noche apenas está comenzando.`;
    }

    // 3. Likes, apoyo y llamados a la comunidad
    if (cleanMsg.includes('me gusta') || cleanMsg.includes('like') || cleanMsg.includes('apoyen') || cleanMsg.includes('compartan')) {
      return `¡Eso mismo ${author}! Revienten ese botón de me gusta y compartan el directo, que la comunidad es lo mejor que tenemos.`;
    }

    // 4. Preguntas de juego, partidas o torneos
    if (cleanMsg.includes('partida') || cleanMsg.includes('juego') || cleanMsg.includes('juegas') || cleanMsg.includes('ronda') || cleanMsg.includes('siguiente')) {
      return `¡Buena pregunta ${author}! Ya casi arranca la siguiente partida, no te despeques que se viene épica.`;
    }

    // 5. Opiniones de actualizaciones, parches y cambios
    if (cleanMsg.includes('actualizacion') || cleanMsg.includes('actualización') || cleanMsg.includes('parche') || cleanMsg.includes('opinas') || cleanMsg.includes('nuevo')) {
      return `En mi opinión ${author}, la nueva actualización está tremenda. Mejoró varias mecánicas y está muy entretenida.`;
    }

    // 6. Personajes favoritos y estilo de juego
    if (cleanMsg.includes('personaje') || cleanMsg.includes('favorito') || cleanMsg.includes('campeon') || cleanMsg.includes('hero')) {
      return `Gran pregunta ${author}. Definitivamente me quedo con los personajes más rápidos y agresivos en la arena.`;
    }

    // 7. Discord y redes sociales
    if (cleanMsg.includes('discord') || cleanMsg.includes('comunidad') || cleanMsg.includes('redes') || cleanMsg.includes('grupo')) {
      return `¡Claro que sí ${author}! Puedes encontrar el enlace del Discord oficial y todas las redes fijados en la descripción del canal.`;
    }

    // 8. Regalos, flores, gorras y donaciones
    if (cleanMsg.includes('regalo') || cleanMsg.includes('rosa') || cleanMsg.includes('corazon') || cleanMsg.includes('gorra') || cleanMsg.includes('donacion') || cleanMsg.includes('super chat')) {
      return `¡Muchísimas gracias por ese regalo y apoyo tremendo, ${author}! Haces que este canal siga creciendo cada día más.`;
    }

    // 9. Música y ambiente
    if (cleanMsg.includes('musica') || cleanMsg.includes('música') || cleanMsg.includes('cancion') || cleanMsg.includes('canción') || cleanMsg.includes('playlist')) {
      return `¡Qué bien que te guste la música ${author}! Siempre buscamos la mejor selección para que disfruten la vibra del directo.`;
    }

    // 10. Preguntas generales
    if (cleanMsg.includes('?') || cleanMsg.includes('¿')) {
      const qReplies = [
        `¡Buena pregunta ${author}! Justo estábamos comentando eso hace un momento en el stream.`,
        `Ojo con lo que pregunta ${author}, sin duda es algo clave para la estrategia de hoy.`,
        `¡Gran detalle ${author}! Me parece que la clave está en mantener la calma y jugar en equipo.`
      ];
      return qReplies[Math.floor(Math.random() * qReplies.length)];
    }

    // Respuestas dinámicas generales
    const defaultReplies = [
      `¡Totalmente de acuerdo contigo, ${author}! Es un puntazo lo que acabas de mencionar.`,
      `Me encanta tu energía en el chat, ${author}. ¡Gracias por acompañarnos en el directo!`,
      `¡Qué crack eres ${author}! Saludos especiales para ti en esta transmisión.`,
      `Ojo a lo que dice ${author}, tiene toda la razón del mundo.`
    ];

    return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
  }
}
