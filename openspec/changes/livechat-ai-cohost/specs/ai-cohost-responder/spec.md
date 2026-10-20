# Spec Delta

## Purpose
Procesa comentarios seleccionados mediante modelos de lenguaje natural (LLM) para generar respuestas orales concisas, dinámicas y contextuales que reflejen la personalidad definida por el streamer.

## ADDED Requirements

### Requirement: Generación de Respuestas con LLM
El sistema SHALL enviar el comentario seleccionado junto al prompt de personalidad al proveedor de IA configurado (Gemini, OpenAI u Ollama) y obtener una respuesta concisa de 1 a 2 oraciones.

#### Scenario: Respuesta generada exitosamente
- **WHEN** un comentario es enviado para procesamiento de IA
- **THEN** el sistema genera una respuesta adaptada al tono del streamer en menos de 2 segundos

#### Scenario: Falla o indisponibilidad de API
- **WHEN** la API del proveedor de IA devuelve un error o se agota el tiempo de espera
- **THEN** el sistema notifica el error en el dashboard sin bloquear el flujo de mensajes

### Requirement: Personalización del Prompt del Copiloto
El sistema SHALL permitir al usuario configurar el nombre, personalidad, instrucciones de comportamiento y límites de extensión de las respuestas de la IA.

#### Scenario: Actualización de personalidad
- **WHEN** el usuario modifica el prompt del copiloto en la interfaz de configuración
- **THEN** las respuestas subsecuentes del LLM adoptan inmediatamente las nuevas directrices

### Requirement: Motor de Inferencia Local en Navegador (SmolLM2-135M ~90MB)
El sistema SHALL soportar ejecución 100% local en el navegador del modelo SmolLM2-135M mediante WebGPU y WebAssembly (WASM), cargando los pesos y tokenizador directamente desde el servidor local (`/models/smollm2/`) sin dependencias de servicios externos ni conectividad a internet.

#### Scenario: Inferencia local en el navegador
- **WHEN** el usuario selecciona el motor de IA "Local (SmolLM2-135M)"
- **THEN** el modelo se carga desde `/models/smollm2/` en la memoria del navegador o GPU y genera respuestas a comentarios en menos de 1 segundo de forma totalmente offline

### Requirement: Modo Auto-Pilot con Filtros Inteligentes
El sistema SHALL permitir la activación de un modo desatendido donde la IA responde automáticamente a comentarios con preguntas o menciones directas respetando un tiempo de enfriamiento (cooldown).

#### Scenario: Auto-respuesta a pregunta con cooldown respetado
- **WHEN** el modo auto-pilot está activo y entra un comentario con signo de interrogación transcurrido el tiempo de cooldown
- **THEN** el sistema encola automáticamente el comentario para ser respondido por la IA
