const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const fs = require('fs');

const API_KEY = process.env.GEMINI_API_KEY;

let genAI;
let fileManager;
let model;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
  fileManager = new GoogleAIFileManager(API_KEY);
  // Using flash-thinking-exp model or gemini-1.5-flash for audio since thinking mode might not support audio well yet
  // However, gemini-1.5-flash is definitely capable of audio transcription.
  // The user mentioned "gemini-2.0-flash-thinking-exp-01-21". Let's try that, but fallback to 1.5-flash for pure transcription if needed.
  // Actually, for simple transcription, 1.5-flash is faster and cheaper. But the user asked for "Thinking Mode" generally.
  // I will use 1.5-flash for transcription specifically, as it's optimized for multimodal.
  model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

/**
 * Transcribes audio file using Gemini.
 * @param {string} filePath - Path to the audio file on disk.
 * @param {string} mimeType - Mime type of the audio file.
 * @returns {Promise<string>} - Transcribed text.
 */
async function transcribeAudio(filePath, mimeType = "audio/mp4") {
  if (!API_KEY) {
    console.warn("GEMINI_API_KEY missing. Returning mock transcription.");
    return "[MOCK] Gemini API Key missing. Transcription simulated.";
  }

  try {
    const uploadResponse = await fileManager.uploadFile(filePath, {
      mimeType,
      displayName: "User Audio Recording",
    });

    console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`);

    const result = await model.generateContent([
      "Transcribe the following audio exactly as spoken. If there are multiple languages (Korean/English), transcribe them accurately.",
      {
        fileData: {
          fileUri: uploadResponse.file.uri,
          mimeType: uploadResponse.file.mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Cleanup: Delete the file from Gemini after processing to save storage/quota
    // Note: It's good practice, though not strictly required immediately.
    try {
        await fileManager.deleteFile(uploadResponse.file.name);
    } catch (cleanupError) {
        console.warn("Failed to delete file from Gemini:", cleanupError);
    }

    return text;
  } catch (error) {
    console.error("Gemini Transcription Error:", error);
    throw new Error("Failed to transcribe audio with Gemini.");
  }
}

/**
 * Generates a response based on text input using the specific model.
 * @param {string} prompt - The prompt to send.
 * @returns {Promise<string>}
 */
async function generateText(prompt) {
    if (!API_KEY) return "[MOCK] No API Key.";
    // Re-instantiate model if needed or use a specific text model
    // The user requested "Thinking Mode" (gemini-2.0-flash-thinking-exp-01-21)
    const textModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-thinking-exp-01-21" });
    const result = await textModel.generateContent(prompt);
    return result.response.text();
}

module.exports = { transcribeAudio, generateText };
