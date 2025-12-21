import { ENV_GEMINI_API_KEY } from '../config';

const GEMINI_MODEL = 'gemini-2.0-flash-thinking-exp-01-21'; // Using the model specified in memory
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export const chatWithGemini = async (messages) => {
  if (!ENV_GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in environment variables');
  }

  // Convert internal message format to Gemini format
  // Internal: { role: 'user' | 'ai' | 'system', content: string }
  // Gemini: { role: 'user' | 'model', parts: [{ text: string }] }
  // Note: Gemini API doesn't always support 'system' role directly in the generic list depending on version,
  // but usually we can prepend it or use systemInstruction if supported.
  // For 'thinking' model, simpler is safer: Map 'ai' -> 'model', 'user' -> 'user'.

  const geminiContents = messages
    .filter(msg => msg.role !== 'system') // Filter out system messages from history for now, or append to first user message
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
            temperature: 0.7, // Standard
        }
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    // Extract text
    // Response structure: candidates[0].content.parts[0].text
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
