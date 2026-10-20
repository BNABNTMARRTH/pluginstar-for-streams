# 🚀 StreamAI Co-Host (pluginstar-for-streams)

[![macOS](https://img.shields.io/badge/Platform-macOS%20Sequoia-black?style=for-the-badge&logo=apple)](https://apple.com)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Metal GPU](https://img.shields.io/badge/Metal-Apple%20Silicon-orange?style=for-the-badge&logo=apple)](https://developer.apple.com/metal/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

> **StreamAI Co-Host** es un panel de control y copiloto de Inteligencia Artificial para streamers de **TikTok Live**, **YouTube Live** y **OBS Studio**, diseñado bajo las directrices estéticas nativas de **Apple Liquid Glass** (macOS Sequoia HIG).

---

## 🌟 Características Principales

- 🪟 **Interfaz Nativa Apple Liquid Glass**:
  - Estructura *NavigationSplitView* de 3 paneles con efecto translúcido y micro-biseles especulares.
  - Botones hápticos `.buttonStyle(.glass)` con animación de resorte.
  - Búsqueda global en tiempo real estilo Spotlight (`⌘K` / `Ctrl+K`).
  - Iconografía vectorial minimalista inspirada en SF Symbols (sin emojis en los controles principales).

- 🧠 **Motor de IA Híbrido (Local en Metal GPU & Nube)**:
  - **Qwen 2.5 (0.5B Instruct - GGUF)**: Inferencia local en backend acelerada por hardware nativo **Apple Silicon Metal GPU** mediante `node-llama-cpp`, con respuesta en **~300 a 500 ms** en español fluido.
  - **Inteligente Co-Host (0 ms)**: Motor semántico reactivo instantáneo para saludos personalizados, regalos, preguntas frecuentes de juego, tiempo de stream y redes sociales.
  - **Nube**: Conectores opcionales para Google Gemini 1.5 Flash, OpenAI GPT-4o-mini y Ollama.

- 🎙️ **Síntesis de Voz Universal (Streaming MP3)**:
  - Generación de audio MP3 multi-idioma garantizado en:
    - 🇪🇸 **Español (`es`)**
    - 🇺🇸 / 🇬🇧 **Inglés (`en`)**
    - 🇷🇺 **Ruso (`ru`)**
    - 🇨🇳 **Chino Mandarín (`zh-CN`)**
  - Cola FIFO secuencial para evitar solapamiento de voces.

- 🎥 **Overlay Transparente para OBS Studio (`/overlay`)**:
  - Cápsula flotante *Liquid Glass* con el orbe de Apple Intelligence, ondas reactivas al sonido y subtítulos dinámicos de alta visibilidad para tus directos.

- 🕹️ **Simulador de Chat en Tiempo Real**:
  - Modo de pruebas con inyección de comentarios y donaciones sintéticas continuas para calibración previa al directo.

---

## 🏗️ Arquitectura del Sistema

El proyecto está diseñado bajo una **Arquitectura Hexagonal (Puertos y Adaptadores)** y una matriz estricta de **Patrones de Diseño GoF clásicos**:

1. **Adapter (GoF #2.1)**: Mapea eventos de TikTok, YouTube y Simulador al DTO canónico inmutable `LiveChatMessage`.
2. **Facade (GoF #2.5)**: `StreamAICoHostFacade` encapsula conectores, colas de auto-pilot, IA y TTS.
3. **Factory Method (GoF #1.2)**: `AIProviderFactory` para la instanciación desacoplada de adaptadores de IA.
4. **Singleton (GoF #1.5)**: `QwenLocalEngine` mantiene el modelo y contexto GPU en memoria sin recargas.
5. **Strategy (GoF #3.9)**: Familia de algoritmos de respuesta intercambiables en caliente.
6. **Chain of Responsibility (GoF #3.1)**: Cadena secuencial de resolución (`FastSemanticHandler` -> `QwenLocalGuardian` -> `FallbackHandler`).
7. **Command & Queue (GoF #3.2)**: Cola FIFO con tiempo de enfriamiento regulable para el Auto-Pilot y voz, garantizando cero pérdida de mensajes.
8. **Observer (GoF #3.7)**: Difusión desacoplada mediante Socket.io hacia el OBS Overlay y el Dashboard.
9. **Template Method (GoF #3.10)**: Pipeline de preprocesamiento, generación y validación de coherencia fonética en español.

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- **Node.js** v20 o superior.
- macOS con Apple Silicon (M1/M2/M3/M4) para aceleración Metal GPU (o CPU en Linux/Windows).

### 1. Clonar el Repositorio
```bash
git clone https://github.com/BNABNTMARRTH/pluginstar-for-streams.git
cd pluginstar-for-streams
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Descargar el Modelo Local Qwen 2.5 (0.5B GGUF)
Descarga automática empaquetada en la carpeta `models/qwen/`:
```bash
node scripts/download_qwen.js
```

### 4. Iniciar la Aplicación
```bash
npm start
```

* **Dashboard del Streamer:** [http://localhost:3050](http://localhost:3050)
* **Overlay Transparente de OBS:** [http://localhost:3050/overlay](http://localhost:3050/overlay)

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con suites de pruebas unitarias y de integración end-to-end:

```bash
# Validación de contratos de dominio e interfaces GoF
node tests/test_contracts.js

# Verificación de flujo Socket.io, chat y respuesta de IA
node tests/test_flow.js
```

---

## 📄 Licencia

Distribuido bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para más información.
