const { GoogleGenerativeAI } = require("@google/generative-ai");
const Agent = require("./Agent");

const API_KEY = process.env.GEMINI_API_KEY;

class GeminiAgent extends Agent {
    constructor(name, persona, modelName = "gemini-1.5-flash") {
        super(name, persona);
        this.modelName = modelName;
        if (API_KEY) {
            this.genAI = new GoogleGenerativeAI(API_KEY);
            this.model = this.genAI.getGenerativeModel({ model: this.modelName });
        } else {
            console.warn(`[${name}] GEMINI_API_KEY missing. Agent will be mocked.`);
        }
    }

    async generateResponse(userMessage, context = []) {
        if (!this.model) {
            return `[${this.name} - Mock] I hear you: "${userMessage}". My persona is: ${this.persona}`;
        }

        try {
            const prompt = `
            Role: You are ${this.name}.
            Persona Description: ${this.persona}

            Task: Respond to the user's message below based strictly on your persona.

            Conversation Context:
            ${context.join("\n")}

            User: ${userMessage}
            ${this.name}:
            `;

            const result = await this.model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error(`Error in agent ${this.name}:`, error);
            return `[${this.name}] I am having trouble thinking right now.`;
        }
    }
}

module.exports = GeminiAgent;
