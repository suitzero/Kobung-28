import { ENV_OPENAI_API_KEY } from '../config';

export const transcribeAudio = async (uri) => {
  if (!ENV_OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY in environment variables');
  }

  const formData = new FormData();
  formData.append('file', {
    uri: uri,
    type: 'audio/m4a', // expo-av default
    name: 'voice.m4a',
  });
  formData.append('model', 'whisper-1');
  formData.append('language', 'ko'); // Or auto-detect, but prompt mentioned supporting mixed Korean/English. OpenAI handles mix well, but hinting 'ko' or 'en' helps. Let's stick to default or make it configurable later. For now, no specific language param to allow mixed detection, or add prompt.

  // The user mentioned "support mixed Korean and English speech" in memory.
  // Whisper is good at this auto-detecting, but we can add a prompt.
  formData.append('prompt', 'This is a conversation in Korean and English.');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV_OPENAI_API_KEY}`,
        // Content-Type is multipart/form-data, but fetch handles boundary automatically if we don't set it manually with FormData
      },
      body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI STT Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.text;

  } catch (error) {
    console.error('OpenAI Transcribe Error:', error);
    throw error;
  }
};
