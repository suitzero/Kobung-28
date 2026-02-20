
/**
 * Base Agent class.
 * Defines the contract for all AI agents.
 */
class Agent {
    constructor(name, persona) {
        this.name = name;
        this.persona = persona;
        this.modelName = "unknown";
    }

    /**
     * Generates a response based on the input.
     * @param {string} userMessage - The user's input.
     * @param {string[]} context - Previous conversation history or system context.
     * @returns {Promise<string>} - The agent's response.
     */
    async generateResponse(userMessage, context = []) {
        throw new Error("Method 'generateResponse' must be implemented.");
    }
}

module.exports = Agent;
