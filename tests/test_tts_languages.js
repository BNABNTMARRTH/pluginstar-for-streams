import { generateSpeech } from '@bestcodes/edge-tts/dist/index.mjs';

async function test() {
  console.log('Probando generación con Edge-TTS para Chino Mandarín...');
  try {
    const audioChinese = await generateSpeech({
      text: '你好，欢迎来到直播间！',
      voice: 'zh-CN-XiaoxiaoNeural'
    });
    console.log('✔ Chino Mandarín generado con éxito, tamaño buffer:', audioChinese.length, 'bytes');

    console.log('Probando generación para Ruso...');
    const audioRussian = await generateSpeech({
      text: 'Привет, добро пожаловать на стрим!',
      voice: 'ru-RU-SvetlanaNeural'
    });
    console.log('✔ Ruso generado con éxito, tamaño buffer:', audioRussian.length, 'bytes');

    console.log('Probando generación para Español (México)...');
    const audioSpanish = await generateSpeech({
      text: '¡Hola a todos en el directo!',
      voice: 'es-MX-DaliaNeural'
    });
    console.log('✔ Español generado con éxito, tamaño buffer:', audioSpanish.length, 'bytes');

    console.log('Probando generación para Inglés...');
    const audioEnglish = await generateSpeech({
      text: 'Hello everyone in the live stream!',
      voice: 'en-US-JennyNeural'
    });
    console.log('✔ Inglés generado con éxito, tamaño buffer:', audioEnglish.length, 'bytes');

    process.exit(0);
  } catch (err) {
    console.error('✖ Error:', err);
    process.exit(1);
  }
}

test();
