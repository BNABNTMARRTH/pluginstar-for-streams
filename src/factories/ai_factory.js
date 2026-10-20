import { BaseAIProviderAdapter } from '../domain/contracts.js';
import { QwenLocalEngine } from '../services/qwen_local.js';

// ============================================================================
// Adaptador de Salida: Qwen 2.5 Local en Metal GPU (GoF #2.1 + #1.5)
// ============================================================================

export class QwenLocalAdapter extends BaseAIProviderAdapter {
  constructor() {
    super('local_qwen');
    this.engine = QwenLocalEngine.getInstance();
  }

  async initialize() {
    return await this.engine.initialize();
  }

  async generateResponse(author, message, personalityPrompt) {
    if (personalityPrompt) {
      this.engine.setPersonalityPrompt(personalityPrompt);
    }
    return await this.engine.generate(author, message);
  }
}

// ============================================================================
// Adaptador de Salida: Heurístico Co-Host Rápido < 5ms (GoF #2.1)
// ============================================================================

export class HeuristicFastAdapter extends BaseAIProviderAdapter {
  constructor() {
    super('fallback');
  }

  async generateResponse(author, message, personalityPrompt) {
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
      return `¡Buena pregunta ${author}! Ya casi arranca la siguiente partida, no te despegues que se viene épica.`;
    }

    // 5. Opiniones de actualizaciones, parches y cambios
    if (cleanMsg.includes('actualizacion') || cleanMsg.includes('actualización') || cleanMsg.includes('parche') || cleanMsg.includes('opinas') || cleanMsg.includes('nuevo') || cleanMsg.includes('ayer')) {
      return `En mi opinión ${author}, la nueva actualización está tremenda. Mejoró varias mecánicas y está súper entretenida.`;
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

// ============================================================================
// Adaptador de Salida: Google Gemini 1.5 Flash (GoF #2.1)
// ============================================================================

export class GeminiCloudAdapter extends BaseAIProviderAdapter {
  constructor(apiKey) {
    super('gemini');
    this.apiKey = apiKey;
  }

  async generateResponse(author, message, personalityPrompt) {
    if (!this.apiKey) throw new Error('API key de Gemini requerida');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const prompt = `Tu rol: ${personalityPrompt}.
El espectador "${author}" dijo en el chat: "${message}".
Responde en máximo 2 oraciones directas para ser leídas por voz (sin emojis ni marcas markdown).`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 60, temperature: 0.8 }
      })
    });

    if (!res.ok) throw new Error(`Gemini API error: ${res.statusText}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text.trim();
    throw new Error('Respuesta vacía de Gemini');
  }
}

// ============================================================================
// Adaptador de Salida: OpenAI GPT-4o-mini (GoF #2.1)
// ============================================================================

export class OpenAICloudAdapter extends BaseAIProviderAdapter {
  constructor(apiKey) {
    super('openai');
    this.apiKey = apiKey;
  }

  async generateResponse(author, message, personalityPrompt) {
    if (!this.apiKey) throw new Error('API key de OpenAI requerida');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `${personalityPrompt} Responde en máximo 2 oraciones para voz.` },
          { role: 'user', content: `${author} dice: "${message}"` }
        ],
        max_tokens: 60,
        temperature: 0.8
      })
    });

    if (!res.ok) throw new Error(`OpenAI error: ${res.statusText}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || '';
  }
}

// ============================================================================
// Adaptador de Salida: Ollama Local (GoF #2.1)
// ============================================================================

export class OllamaLocalAdapter extends BaseAIProviderAdapter {
  constructor(endpoint = 'http://localhost:11434') {
    super('ollama');
    this.endpoint = endpoint;
  }

  async generateResponse(author, message, personalityPrompt) {
    const res = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:latest',
        prompt: `${personalityPrompt}\nEl espectador ${author} comenta: "${message}". Responde en 1 o 2 oraciones:`,
        stream: false
      })
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
    const data = await res.json();
    return data?.response?.trim() || '';
  }
}

// ============================================================================
// Fábrica de Adaptadores de IA (Factory Method Pattern - GoF #1.2)
// ============================================================================

export class AIProviderFactory {
  static createAdapter(providerId, options = {}) {
    switch (providerId) {
      case 'local_qwen':
        return new QwenLocalAdapter();
      case 'gemini':
        return new GeminiCloudAdapter(options.apiKey);
      case 'openai':
        return new OpenAICloudAdapter(options.apiKey);
      case 'ollama':
        return new OllamaLocalAdapter(options.endpoint);
      case 'fallback':
      default:
        return new HeuristicFastAdapter();
    }
  }
}
