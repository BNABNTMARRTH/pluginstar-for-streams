import { io } from 'socket.io-client';

console.log('--- Iniciando prueba automatizada de flujo de StreamAI Co-Host ---');

const socket = io('http://localhost:3050');

let receivedInitialState = false;
let receivedChatMessage = false;
let receivedAIReply = false;

socket.on('connect', () => {
  console.log('✔ Socket conectado exitosamente al servidor (ID:', socket.id, ')');
});

socket.on('initial_state', (state) => {
  receivedInitialState = true;
  console.log('✔ Estado inicial recibido:', {
    aiProvider: state.ai.provider,
    botName: state.ai.botName,
    hasApiKey: state.ai.hasApiKey
  });

  // Disparar generación de 1 mensaje simulado
  console.log('-> Solicitando 1 mensaje de prueba al simulador...');
  socket.emit('simulate_single');
});

socket.on('chat_message', (msg) => {
  receivedChatMessage = true;
  console.log(`✔ Mensaje de chat recibido: [${msg.platform.toUpperCase()}] ${msg.author}: "${msg.message}"`);

  // Disparar solicitud de respuesta de IA
  console.log('-> Solicitando respuesta de IA para el comentario...');
  socket.emit('request_ai_reply', msg);
});

socket.on('ai_reply', (data) => {
  receivedAIReply = true;
  console.log(`✔ Respuesta de IA recibida exitosamente: "${data.replyText}"`);
  console.log('✔ Audio payload listo para TTS:', data.audioPayload?.voice);

  console.log('\n=========================================');
  console.log('🎉 TODAS LAS PRUEBAS DE FLUJO PASARON CON ÉXITO');
  console.log('=========================================');
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('✖ Error de conexión:', err.message);
  process.exit(1);
});

// Timeout de seguridad
setTimeout(() => {
  console.error('✖ Tiempo de espera agotado para la prueba');
  socket.disconnect();
  process.exit(1);
}, 8000);
