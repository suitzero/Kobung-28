require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- RAG Placeholder ---
// In a real app, you would use a vector database (e.g., Pinecone, Weaviate) or a library like LangChain
// to retrieve relevant documents based on the user's query.
const KNOWLEDGE_BASE = [
  "The companion is a friendly AI designed to help you with daily tasks.",
  "You can ask the companion to change its color or animation.",
  "The companion was built using React Native and Three.js.",
  "This app uses Google Gemini for its intelligence.",
  "The user loves to code in Python and JavaScript."
];

function retrieveContext(query) {
  // Simple keyword matching for demonstration purposes.
  // In production, use embeddings and cosine similarity.
  const relevantFacts = KNOWLEDGE_BASE.filter(fact =>
    fact.toLowerCase().split(' ').some(word => query.toLowerCase().includes(word) && word.length > 3)
  );

  return relevantFacts.join("\n");
}

// --- Gemini Setup ---
// WARNING: Do not hardcode API keys in production. Use environment variables.
const API_KEY = process.env.GEMINI_API_KEY;
// If API_KEY is missing, we will mock the response.

let genAI;
let model;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-pro"});
}

// --- OpenAI Setup ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
let openai;
if (OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
}

async function processTextChat(message) {
  const context = retrieveContext(message);

  let reply;
  if (model) {
    const prompt = `
      You are a helpful 3D companion.
      Context: ${context}

      User: ${message}
      Companion:
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    reply = response.text();
  } else {
    console.warn("Gemini API Key not found. Using mock response.");
    reply = `[MOCK] I received your message: "${message}". I don't have a real brain yet because the GEMINI_API_KEY is missing, but I know about: ${context || 'nothing related to this'}.`;
  }
  return reply;
}

app.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const reply = await processTextChat(message);
    res.json({ reply });
  } catch (error) {
    console.error("Error generating response:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/voice', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  const filePath = req.file.path;

  try {
    let transcription;

    if (openai) {
      // Create a read stream from the uploaded file
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
      });
      transcription = transcriptionResponse.text;
    } else {
      console.warn("OPENAI_API_KEY missing. Using mock transcription.");
      transcription = "[MOCK] This is a simulated transcription of your voice.";
    }

    // Process the transcribed text with Gemini
    const reply = await processTextChat(transcription);

    res.json({ transcription, reply });

  } catch (error) {
    console.error("Error processing voice:", error);
    res.status(500).json({ error: 'Error processing voice input' });
  } finally {
    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Export for use if we were modularizing, but here we just keep it in one file for now.
module.exports = { processTextChat };
