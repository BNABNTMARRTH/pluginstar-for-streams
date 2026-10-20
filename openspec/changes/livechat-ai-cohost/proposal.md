# Proposal

## Why
Los creadores de contenido que transmiten en vivo en múltiples plataformas simultáneamente (TikTok Live, YouTube Live, Twitch) enfrentan una sobrecarga cognitiva severa al intentar leer y responder comentarios en múltiples pantallas. Esto reduce la interacción con la audiencia y la retención de espectadores. Implementar una aplicación con interfaz visual que unifique los chats y cuente con un copiloto de Inteligencia Artificial capaz de leer y responder selectiva o automáticamente mediante voz sintética (TTS) resuelve este problema y eleva la calidad del stream.

## What Changes
- **Nuevo Dashboard Web Unificado Apple Liquid Glass**: Interfaz visual nativa estilo macOS Sequoia HIG (`NavigationSplitView`, botones hápticos translúcidos `.buttonStyle(.glass)`, controles de ventana semáforo, orbe de Apple Intelligence e iconografía minimalista vectorial sin emojis).
- **Conectores de Streaming en Tiempo Real**: Soporte nativo para conectarse a TikTok Live (mediante `@username`) y YouTube Live (mediante video ID o URL).
- **Simulador de Chat Integrado**: Permite al streamer probar respuestas y calibrar la voz y la IA sin necesidad de estar transmitiendo en vivo.
- **Motor de IA Conversacional Híbrido (Local + Cloud)**: Soporte para ejecución 100% en el navegador con **SmolLM2-135M (~90MB)** servido localmente desde `/models/smollm2/` vía WebGPU/WASM, además de Google Gemini y OpenAI.
- **Síntesis de Voz Universal Multi-Idioma (Streaming MP3)**: Endpoint `/api/tts` que genera y transmite audio nativo en **Español, Inglés, Ruso y Chino Mandarín** con cola secuencial sin solapamiento sonoro.
- **Modos Manual y Auto-Pilot**: Capacidad de responder manualmente con un clic a cualquier comentario o activar modo automático con filtros de cooldown y preguntas clave.
- **Overlay para OBS Studio**: Ruta web transparente (`/overlay`) para integrar avatares, ondas de sonido y subtítulos en OBS.

## Capabilities

### New Capabilities
- `live-chat-monitor`: Conexión, escucha y normalización de eventos de comentarios y regalos desde TikTok Live y YouTube Live.
- `ai-cohost-responder`: Procesamiento inteligente de comentarios, aplicación de directrices de personalidad y generación de respuestas cortas.
- `voice-synthesis-tts`: Generación de voz natural en español mediante TTS y cola secuencial de audio para el navegador y OBS.
- `streamer-dashboard`: Panel web de control para monitoreo, interacción manual, configuración de IA/voz y widget de overlay para OBS.

### Modified Capabilities
<!-- Ninguna capacidad previa existente en el repositorio -->

## Impact
- **Dependencias**: Se incorporará Node.js con `express`, `socket.io`, `tiktok-live-connector`, `@distube/ytdl-core` / `youtube-chat` (o cliente websocket/polling) y `edge-tts`.
- **APIs**: Conexión opcional a APIs de Google Gemini (`@google/genai` o REST) y OpenAI, o conexión a endpoint local de Ollama.
- **Sistemas**: Salida de audio al sistema operativo y puerto HTTP local para conexión de OBS Studio.
