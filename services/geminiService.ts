
import { GoogleGenAI } from "@google/genai";

// Always use named parameter for apiKey and use process.env.API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getDJFeedback = async (vibe: number, score: number, combo: number) => {
  try {
    const prompt = `You are a 90s Techno DJ Legend.
    Current Game Stats:
    - Crowd Vibe: ${vibe}%
    - Score: ${score}
    - Combo: ${combo}
    
    Give a short (max 10 words), high-energy feedback in French like it's 1995. Use words like "Allez!", "Puissance!", "Vibe!", "Masterclass!". Be cool and retro.`;

    // Use generateContent for text answers with the correct model and prompt structure
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Tu es un DJ de techno des années 90, très énergique et charismatique.",
        temperature: 0.9,
      }
    });

    // Access the text property directly from the response
    return response.text || "CONTINUE COMME ÇA !";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "FEU SUR LE DANCEFLOOR !";
  }
};
