# Tasks

## 1. Configuración y Scaffolding Base

- [x] 1.1 Crear `package.json` con dependencias del servidor (`express`, `socket.io`, `tiktok-live-connector`, `@google/genai`) y scripts de ejecución.
- [x] 1.2 Crear estructura modular del proyecto (`src/` para backend y `public/` para interfaz web) y verificar el levantamiento del servidor HTTP en `http://localhost:3050`.

## 2. Conectores de Chat en Vivo y Simulador

- [x] 2.1 Implementar `src/connectors/tiktok.js` utilizando `tiktok-live-connector` para capturar comentarios y eventos en vivo con reconexión automática.
- [x] 2.2 Implementar `src/services/simulator.js` para generar comentarios de prueba interactivos de TikTok y YouTube.
- [x] 2.3 Implementar `src/connectors/youtube.js` para capturar chat de transmisiones públicas de YouTube Live y normalizar el formato de eventos hacia Socket.io.

## 3. Motor de Inteligencia Artificial (LLM)

- [x] 3.1 Implementar `src/services/ai.js` con cliente unificado para Google Gemini API (o fallback de plantilla local), procesando el comentario con el prompt de personalidad configurado.
- [x] 3.2 Implementar lógica de filtrado de preguntas y modo Auto-Pilot con limitador de frecuencia (cooldown regulable).

## 4. Motor de Síntesis de Voz (TTS) y Cola de Audio

- [x] 4.1 Implementar `src/services/tts.js` integrando generación de voz neural en español con `edge-tts` (o Web Speech API como fallback instantáneo sin dependencias binarias).
- [x] 4.2 Implementar cola de reproducción de audio secuencial en el cliente para garantizar que las respuestas de voz no se solapen.

## 5. Panel de Control Web y Overlay para OBS

- [x] 5.1 Construir la interfaz de usuario `public/index.html` y estilos `public/style.css` con diseño oscuro de alto impacto visual (glassmorphism, animaciones, badges de TikTok/YouTube y panel de estadísticas).
- [x] 5.2 Desarrollar el controlador frontend `public/app.js` con conexión a WebSockets, botones rápidos de "Responder con IA" y selector de modos.
- [x] 5.3 Construir la vista de OBS Studio `public/overlay.html` con fondo 100% transparente, tarjeta de espectador, subtítulos dinámicos y ondas de audio reactivas.

## 6. Verificación Integral

- [x] 6.1 Ejecutar prueba funcional completa de extremo a extremo usando el simulador y validar la recepción en dashboard, inferencia de IA, audio TTS y render en overlay.

## 7. Modelo In-Browser Local (SmolLM2-135M) y Streaming Multi-Idioma

- [x] 7.1 Implementar endpoint de streaming `/api/tts` con soporte garantizado para Español (`es`), Inglés (`en`), Ruso (`ru`) y Chino Mandarín (`zh`).
- [x] 7.2 Descargar pesos cuantizados de SmolLM2-135M (`onnx/model_q4f16.onnx`, `onnx/model_q4.onnx`, tokenizador y configuraciones) en `public/models/smollm2/`.
- [x] 7.3 Configurar `public/app.js` para cargar el modelo localmente desde el servidor Express (`/models/smollm2/`) en lugar de repositorios remotos.
- [x] 7.4 Validar la inferencia en navegador y el encadenamiento automático con la cola de audio multi-idioma.
