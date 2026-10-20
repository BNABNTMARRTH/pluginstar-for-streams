# Design

## Context
Ver `proposal.md` para la motivación. La aplicación debe ejecutarse localmente en la máquina del streamer sin requerir configuraciones de servidores en la nube ni bases de datos externas. Debe ser ligera, arrancar en pocos segundos y exponer tanto una interfaz web accesible por navegador como un endpoint de overlay para OBS Studio.

## Goals / Non-Goals

**Goals:**
- Proveer un backend en Node.js que unifique los streams de chat de TikTok y YouTube mediante WebSockets hacia un frontend en tiempo real.
- Modularizar el conector de IA para soportar Google Gemini, OpenAI u Ollama con selección mediante interfaz de usuario.
- Integrar síntesis de voz mediante `edge-tts` para generar respuestas en audio de alta fidelidad sin coste de API.
- Diseñar una interfaz gráfica con estética oscura moderna (dark mode, glassmorphism, badges de plataforma y controles táctiles/rápidos).
- Exponer una vista web `/overlay` transparente para incrustar como fuente de navegador en OBS Studio.

**Non-Goals:**
- No incluye transcripción de voz del streamer (STT / Speech-to-Text) en esta fase inicial; el foco son los comentarios de la audiencia.
- No incluye autenticación multi-usuario o cuentas en la nube; es una herramienta de uso local personal.
- No automatiza la publicación de respuestas en texto dentro del chat de TikTok debido a las políticas anti-spam de la plataforma; las respuestas son por voz y overlay visual.

## Decisions

### 1. Entorno de Ejecución: Node.js + Express + Socket.io
- **Decisión**: Utilizar Node.js para el servidor backend y WebSocket server.
- **Alternativas consideradas**: Python (FastAPI/Flask).
- **Razón**: `tiktok-live-connector` en Node.js es el conector de código abierto más activo y maduro para TikTok Live. Además, Node.js maneja la concurrencia de eventos en tiempo real con Socket.io de forma nativa sin lidiar con entornos virtuales de Python (`venv`).

### 2. Frontend: Arquitectura Apple Liquid Glass (macOS Sequoia HIG)
- **Decisión**: Implementar el patrón Liquid Glass de Apple (`NavigationSplitView` de triple panel, micro-biseles especulares de luz blanca, fondo translúcido con `backdrop-filter: blur`, botones elásticos `.buttonStyle(.glass)`, orbe de Apple Intelligence e iconografía minimalista en SVG sin emojis).
- **Razón**: Máxima fidelidad visual que eleva la estética del software profesional de transmisión a nivel de aplicación nativa de macOS, con cero overhead de frameworks pesados y mínimo consumo de recursos durante el streaming.

### 3. Motor de Voz Universal Multi-Idioma (Streaming MP3)
- **Decisión**: Servidor de audio en `/api/tts?text=...&lang=...` que emite flujos nativos `audio/mpeg` (MP3) para **Español (`es`)**, **Inglés (`en`)**, **Ruso (`ru`)** y **Chino Mandarín (`zh-CN`)**.
- **Alternativas consideradas**: `window.speechSynthesis` nativo del navegador.
- **Razón**: `window.speechSynthesis` falla silenciosamente en macOS para Chino y Ruso si el streamer no ha descargado manualmente los paquetes de voz en los Ajustes del Sistema. El streaming nativo de MP3 funciona en el 100% de los navegadores sin configuración previa.

### 4. Motor de IA Híbrido con In-Browser SmolLM2-135M (~90MB)
- **Decisión**: Pre-empaquetar los pesos cuantizados de SmolLM2-135M (`onnx/model_q4f16.onnx`, tokenizador y configuraciones) en `public/models/smollm2/` para inferencia directa en el navegador vía Transformers.js (WebGPU/WASM), junto a conectores de nube (Gemini/OpenAI).
- **Razón**: Permite arrancar la IA local al instante (< 1s) sin descargas lentas de Hugging Face en tiempo de ejecución y con privacidad y funcionamiento 100% offline.

## Risks / Trade-offs

- **[Riesgo de cambios en el protocolo de TikTok Live]** → *Mitigación*: `tiktok-live-connector` se actualiza frecuentemente por la comunidad; además, se provee un simulador de chat local para garantizar que la aplicación siempre pueda operar en pruebas o eventos offline.
- **[Latencia acumulada entre IA y TTS]** → *Mitigación*: Se fuerza al LLM a responder en 1-2 oraciones cortas (máximo 150 caracteres) y se transmiten los chunks de audio de forma directa a la cola de reproducción.
- **[Saturación de comentarios en streams de alto volumen]** → *Mitigación*: Implementación de un búfer de tamaño fijo con política FIFO y un limitador de frecuencia (rate limit / cooldown) en el modo Auto-Pilot.
