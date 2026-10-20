import { createCanonicalChatMessage, BaseAIProviderAdapter } from '../src/domain/contracts.js';
import { AIProviderFactory, HeuristicFastAdapter, QwenLocalAdapter } from '../src/factories/ai_factory.js';

console.log('--- Iniciando prueba de contratos e interfaces GoF ---');

// 1. Probar contrato LiveChatMessage
try {
  const msg1 = createCanonicalChatMessage({
    platform: 'tiktok',
    author: 'Gamer_99',
    message: '¿Tienes canal de Discord?',
    isQuestion: true
  });

  if (!msg1.id || msg1.author !== 'Gamer_99' || !msg1.isQuestion || !Object.isFrozen(msg1)) {
    throw new Error('Falla en validación de LiveChatMessage');
  }
  console.log('✔ Contrato LiveChatMessage validado exitosamente (Entidad Inmutable)');
} catch (err) {
  console.error('❌ Error en prueba de LiveChatMessage:', err.message);
  process.exit(1);
}

// 2. Probar Fábrica de Proveedores de IA (GoF #1.2)
try {
  const adapterHeuristic = AIProviderFactory.createAdapter('fallback');
  if (!(adapterHeuristic instanceof BaseAIProviderAdapter) || !(adapterHeuristic instanceof HeuristicFastAdapter)) {
    throw new Error('AIProviderFactory no devolvió HeuristicFastAdapter');
  }

  const adapterQwen = AIProviderFactory.createAdapter('local_qwen');
  if (!(adapterQwen instanceof BaseAIProviderAdapter) || !(adapterQwen instanceof QwenLocalAdapter)) {
    throw new Error('AIProviderFactory no devolvió QwenLocalAdapter');
  }

  console.log('✔ AIProviderFactory (GoF #1.2) validada exitosamente con adaptador BaseAIProviderAdapter');
} catch (err) {
  console.error('❌ Error en prueba de AIProviderFactory:', err.message);
  process.exit(1);
}

// 3. Probar ejecución con Template Method en HeuristicFastAdapter
try {
  const heuristic = AIProviderFactory.createAdapter('fallback');
  const res = await heuristic.execute('Valen_Rider', '¿A qué hora juegas la siguiente partida?', 'Eres Aura.');
  if (!res || typeof res !== 'string' || res.length < 5) {
    throw new Error('HeuristicFastAdapter devolvió respuesta inválida');
  }
  console.log('✔ Template Method (GoF #3.10) en HeuristicFastAdapter validado:', `"${res}"`);
} catch (err) {
  console.error('❌ Error en prueba de Template Method:', err.message);
  process.exit(1);
}

console.log('\n=========================================');
console.log('🎉 TODOS LOS CONTRATOS E INTERFACES GOF FUERON VALIDADOS');
console.log('=========================================');
process.exit(0);
