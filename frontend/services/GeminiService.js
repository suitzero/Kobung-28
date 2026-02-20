import { ENV_GEMINI_API_KEY } from '../config';
import * as FileSystem from 'expo-file-system';

const GEMINI_MODEL = 'gemini-2.0-flash-thinking-exp-01-21'; // Using the thinking model as requested
// For audio, we might need a model that supports audio input. gemini-1.5-flash is safer for audio,
// but let's try 2.0-flash-thinking first if it supports multimodal. If not, fallback to 1.5-flash.
// The user explicitly asked for "Thinking Mode".
// However, the thinking model is usually text-to-text focused in early previews.
// I'll stick to 1.5-flash for transcription specifically if 2.0 fails, or use 1.5-flash for transcription and 2.0 for chat.
// Let's use 1.5-flash for transcription to be safe and fast.
const TRANSCRIPTION_MODEL = 'gemini-1.5-flash';

const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TRANSCRIPTION_URL = `https://generativelanguage.googleapis.com/v1beta/models/${TRANSCRIPTION_MODEL}:generateContent`;

export const chatWithGemini = async (messages) => {
  if (!ENV_GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in environment variables');
  }

  const geminiContents = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

  try {
    const response = await fetch(`${BASE_URL}?key=${ENV_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: {
            temperature: 0.7,
        }
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
        throw new Error('No reply from Gemini');
    }

    return reply;

  } catch (error) {
    console.error('Gemini Chat Error:', error);
    throw error;
  }
};

export const transcribeAudio = async (uri) => {
    if (!ENV_GEMINI_API_KEY) {
        throw new Error('Missing GEMINI_API_KEY');
    }

    try {
        const base64Audio = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const body = {
            contents: [{
                role: "user",
                parts: [
                    {
                        inlineData: {
                            mimeType: "audio/mp4", // expo-av records m4a/mp4
                            data: base64Audio
                        }
                    },
                    {
                        text: "Transcribe this audio exactly."
                    }
                ]
            }]
        };

        const response = await fetch(`${TRANSCRIPTION_URL}?key=${ENV_GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini Transcription Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const transcription = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return transcription || "[Audio not recognized]";

    } catch (error) {
        console.error("Gemini Transcribe Error:", error);
        throw error;
    }
};
