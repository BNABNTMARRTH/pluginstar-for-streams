# AI Co-Host Responder Specification

## Purpose
Procesa comentarios seleccionados mediante modelos de lenguaje natural (LLM) para generar respuestas orales concisas, dinámicas y contextuales que reflejen la personalidad definida por el streamer.

## Requirements

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

### Requirement: Motor de Inferencia Neuronal Local en Backend (Qwen 2.5 - 0.5B Metal GPU)
El sistema SHALL soportar ejecución 100% local en el backend del modelo Qwen 2.5 (0.5B Instruct) mediante `node-llama-cpp` con aceleración de hardware nativa Apple Silicon Metal, cargando los pesos cuantizados GGUF directamente desde el servidor local (`/models/qwen/qwen2.5-0.5b-instruct-q4_k_m.gguf`) sin dependencias de servicios externos ni conectividad a internet.

#### Scenario: Inferencia neuronal local en backend
- **WHEN** el usuario selecciona el motor de IA "Qwen 2.5 0.5B Local (Metal GPU)"
- **THEN** el modelo genera respuestas a comentarios en español fluido en menos de 600 ms aprovechando la GPU del chip Apple Silicon sin consumir recursos en la pestaña del navegador

### Requirement: Motor Inteligente Co-Host Heurístico (Instantáneo 0ms)
El sistema SHALL proveer una estrategia reactiva basada en el patrón Chain of Responsibility con `FastSemanticHandler` para responder instantáneamente (< 5ms) a intenciones comunes de transmisiones en vivo (saludos con dedicatoria, donaciones, preguntas de partidas, discord, música y preguntas generales) con validación estricta de coherencia fonética en español.

#### Scenario: Respuesta semántica instantánea
- **WHEN** entra un comentario de stream común (ej. saludo, pregunta de juego o donación) y el modo Inteligente Co-Host está activo
- **THEN** el sistema genera una respuesta natural y variada en español en menos de 5 ms sin consumo de CPU

### Requirement: Modo Auto-Pilot con Cola FIFO de Comandos (Command Queue GoF #3.2)
El sistema SHALL implementar una cola secuencial FIFO de comandos de respuesta automática que impida la pérdida o descarte de comentarios cuando el chat se mueve a alta velocidad, respetando un tiempo de enfriamiento regulable y permitiendo alternar entre atender el 100% de los mensajes ("Responder a Todos") o únicamente preguntas con signo de interrogación.

#### Scenario: Encolamiento y despacho sin pérdida de mensajes
- **WHEN** el modo auto-pilot está activo y entran ráfagas continuas de comentarios
- **THEN** los comentarios se insertan en la cola FIFO y se van respondiendo secuencialmente al transcurrir el tiempo de enfriamiento establecido sin descartar ningún mensaje previo
