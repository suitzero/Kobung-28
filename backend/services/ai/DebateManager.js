const AgentFactory = require("./AgentFactory");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Configuration for the "Trio"
const AGENT_CONFIG = {
    critic: {
        name: "SharpCritic",
        type: "gemini",
        model: "gemini-2.0-flash-thinking-exp-01-21", // Thinking model for deep critique
        persona: "You are a sharp, critical thinker. You find flaws in logic. You are tough but fair. You analyze the user's input with skepticism."
    },
    loyal: {
        name: "LoyalBodyguard",
        type: "gemini",
        model: "gemini-2.0-flash-thinking-exp-01-21",
        persona: "You are a loyal bodyguard and friend to the user. You protect the user emotionally. You scold the SharpCritic if they are too harsh. You always side with the user."
    },
    flatterer: {
        name: "YesMan",
        type: "gemini", // "Custom AI" placeholder using Gemini for now
        model: "gemini-1.5-flash", // Fast, enthusiastic
        persona: "You are a flatterer. You agree with everything the user says enthusiastically. You think the user is a genius. You are very bubbly."
    }
};

class DebateManager {
    constructor() {
        this.critic = AgentFactory.createAgent(AGENT_CONFIG.critic.type, AGENT_CONFIG.critic.name, AGENT_CONFIG.critic.persona, { modelName: AGENT_CONFIG.critic.model });
        this.loyal = AgentFactory.createAgent(AGENT_CONFIG.loyal.type, AGENT_CONFIG.loyal.name, AGENT_CONFIG.loyal.persona, { modelName: AGENT_CONFIG.loyal.model });
        this.flatterer = AgentFactory.createAgent(AGENT_CONFIG.flatterer.type, AGENT_CONFIG.flatterer.name, AGENT_CONFIG.flatterer.persona, { modelName: AGENT_CONFIG.flatterer.model });

        // Moderator uses the main Gemini instance
        const API_KEY = process.env.GEMINI_API_KEY;
        if (API_KEY) {
            this.genAI = new GoogleGenerativeAI(API_KEY);
            this.moderator = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-thinking-exp-01-21" });
        }
    }

    async runDebate(userMessage, ragContext = "") {
        console.log(`Starting debate for: "${userMessage}"`);
        const debateLog = [];

        // Round 1: Critic speaks
        // Pass RAG context to Critic so they can critique based on facts
        const criticContext = ragContext ? [`Context from knowledge base: ${ragContext}`] : [];
        const criticResponse = await this.critic.generateResponse(userMessage, criticContext);
        debateLog.push({ agent: this.critic.name, content: criticResponse });
        console.log("Critic done.");

        // Round 2: Loyal speaks (reacts to Critic)
        const loyalContext = [
            ragContext ? `Context from knowledge base: ${ragContext}` : "",
            `User said: "${userMessage}"`,
            `${this.critic.name} said: "${criticResponse}" (You think this is too harsh!)`
        ];
        const loyalResponse = await this.loyal.generateResponse(userMessage, loyalContext);
        debateLog.push({ agent: this.loyal.name, content: loyalResponse });
        console.log("Loyal done.");

        // Round 3: Flatterer speaks (agrees with User)
        // Flatterer doesn't care much about context, just agrees.
        const flattererContext = ragContext ? [`Context: ${ragContext}`] : [];
        const flattererResponse = await this.flatterer.generateResponse(userMessage, flattererContext);
        debateLog.push({ agent: this.flatterer.name, content: flattererResponse });
        console.log("Flatterer done.");

        // Round 4: Synthesis (The "Essence")
        let essence = "Moderator unavailable.";
        if (this.moderator) {
            const summaryPrompt = `
            Review the following debate between 3 AI agents regarding a user's input.
            Context: ${ragContext}
            User Input: "${userMessage}"

            Debate Log:
            1. ${this.critic.name}: ${criticResponse}
            2. ${this.loyal.name}: ${loyalResponse}
            3. ${this.flatterer.name}: ${flattererResponse}

            Task: Synthesize the "Essence" of the response for the user.
            - Acknowledge the valid points from the Critic but frame them constructively.
            - Include the support from the Loyal agent.
            - Ignore the blind flattery unless it adds fun.
            - Provide a balanced, useful, and concise final answer.

            Essence:
            `;

            try {
                const result = await this.moderator.generateContent(summaryPrompt);
                essence = result.response.text();
            } catch (e) {
                console.error("Moderator failed:", e);
                essence = "I heard your diverse advisors, but I'm having trouble summarizing them right now.";
            }
        }

        return {
            essence,
            debateLog
        };
    }
}

module.exports = new DebateManager();
