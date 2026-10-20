import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { StreamAICoHostFacade } from './facades/stream_facade.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Manejar favicon para evitar 404 en consola
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Inicializar la Fachada del Subsistema (Facade Pattern - GoF #2.5)
const facade = new StreamAICoHostFacade(io);

// Rutas API HTTP
app.get('/api/status', (req, res) => {
  res.json(facade.getSystemStatus());
});

// Endpoint para generación y streaming de audio MP3 multi-idioma (es, en, ru, zh)
app.get('/api/tts', async (req, res) => {
  const text = (req.query.text || '').trim();
  const lang = req.query.lang || facade.tts.lang || 'es';

  if (!text) {
    return res.status(400).send('Parámetro text requerido');
  }

  try {
    const audioBuffer = await facade.tts.fetchAudioBuffer(text, lang);
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=86400'
    });
    res.send(audioBuffer);
  } catch (err) {
    console.error('Error generando audio MP3:', err.message);
    res.status(500).send('Error generando audio');
  }
});

// Ruta para OBS Overlay
app.get('/overlay', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/overlay.html'));
});

// Socket.io Handlers (Adaptador de Entrada de Comandos UI)
io.on('connection', (socket) => {
  console.log(`[Socket.io] Cliente conectado: ${socket.id}`);

  // Enviar estado inicial consolidado
  socket.emit('initial_state', facade.getSystemStatus());

  // Conectar / Desconectar TikTok
  socket.on('connect_tiktok', (data) => {
    try {
      facade.tiktok.connect(data.username);
    } catch (err) {
      socket.emit('error_notification', { message: err.message });
    }
  });

  socket.on('disconnect_tiktok', () => {
    facade.tiktok.disconnect();
  });

  // Conectar / Desconectar YouTube
  socket.on('connect_youtube', (data) => {
    try {
      facade.youtube.connect(data.urlOrId);
    } catch (err) {
      socket.emit('error_notification', { message: err.message });
    }
  });

  socket.on('disconnect_youtube', () => {
    facade.youtube.disconnect();
  });

  // Simulador de Chat
  socket.on('toggle_simulator', (data) => {
    if (data?.start) {
      facade.simulator.start(data.intervalMs || 4000);
    } else {
      facade.simulator.stop();
    }
  });

  socket.on('simulate_single', () => {
    facade.simulator.emitSingle();
  });

  // Solicitud manual de respuesta de IA
  socket.on('request_ai_reply', async (msg) => {
    try {
      await facade.generateAndBroadcastReply(msg, false);
    } catch (err) {
      console.error('Error al responder con IA:', err);
      socket.emit('error_notification', { message: 'No se pudo generar la respuesta de IA' });
    }
  });

  // Recepción de respuesta generada por cliente o modelo alternativo
  socket.on('client_ai_reply', (data) => {
    const audioPayload = facade.tts.getAudioPayload(data.replyText, data.originalMessage?.author, data.lang);
    io.emit('ai_reply', {
      id: `reply_${Date.now()}`,
      originalMessage: data.originalMessage,
      replyText: data.replyText,
      audioPayload,
      timestamp: Date.now()
    });
  });

  // Solicitud manual de lectura TTS directa del comentario
  socket.on('read_tts_message', (msg) => {
    const text = `${msg.author} dice: ${msg.message}`;
    const audioPayload = facade.tts.getAudioPayload(text, msg.author);
    io.emit('play_audio_tts', {
      text,
      author: msg.author,
      audioPayload
    });
  });

  // Configuración de Auto-Pilot (Command Queue)
  socket.on('update_autopilot', (config) => {
    Object.assign(facade.autoPilotState, config);
    if (!facade.autoPilotState.enabled) {
      facade.autoPilotQueue.length = 0;
    } else {
      facade.processNextAutoPilotCommand();
    }
    io.emit('autopilot_updated', facade.autoPilotState);
  });

  // Configuración de IA y TTS
  socket.on('update_ai_config', (config) => {
    facade.updateAIConfig(config);
    io.emit('ai_config_updated', {
      provider: facade.activeProviderId,
      botName: facade.botName,
      personalityPrompt: facade.personalityPrompt
    });
  });

  socket.on('update_tts_config', (config) => {
    facade.tts.updateConfig(config);
    io.emit('tts_config_updated', {
      lang: facade.tts.lang,
      rate: facade.tts.rate,
      volume: facade.tts.volume,
      isMuted: facade.tts.isMuted
    });
  });
});

// Interceptar chat_message emitidos para pasarlos por la fachada y alimentar el Auto-Pilot
const originalEmit = io.emit.bind(io);
io.emit = function (event, ...args) {
  if (event === 'chat_message' && args[0]) {
    facade.onChatMessageReceived(args[0]);
  }
  return originalEmit(event, ...args);
};

const PORT = process.env.PORT || 3050;
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 StreamAI Co-Host iniciado con éxito`);
  console.log(`🖥️  Dashboard Streamer: http://localhost:${PORT}`);
  console.log(`🎨 OBS Overlay:       http://localhost:${PORT}/overlay`);
  console.log(`=========================================`);
});
