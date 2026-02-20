const GeminiAgent = require("./GeminiAgent");

class AgentFactory {
    static createAgent(type, name, persona, config = {}) {
        switch (type) {
            case "gemini":
                return new GeminiAgent(name, persona, config.modelName || "gemini-1.5-flash");
            // Future: case "claude": return new ClaudeAgent(...)
            // Future: case "custom": return new CustomAgent(...)
            default:
                console.warn(`Unknown agent type: ${type}. Defaulting to Gemini.`);
                return new GeminiAgent(name, persona, "gemini-1.5-flash");
        }
    }
}

module.exports = AgentFactory;
