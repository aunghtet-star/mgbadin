
import { GoogleGenAI } from "@google/genai";

export class RiskAI {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async analyzeRisk(currentBets: any[], limits: any[]) {
    const prompt = `
      Analyze the following 3D lottery betting data for a "Banker".
      Current Top Bets: ${JSON.stringify(currentBets.slice(0, 10))}
      Current Limits: ${JSON.stringify(limits)}

      Tasks:
      1. Identify "Dangerous Numbers" where payout liability exceeds safe thresholds.
      2. Suggest new limits for "Hot Numbers" based on betting velocity.
      3. Predict potential outlier behavior.
      
      Format the output as a professional risk report for an admin dashboard.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 }
        }
      });

      return response.text;
    } catch (error) {
      console.error("AI Analysis Error:", error);
      return "Unable to perform deep analysis at this time.";
    }
  }
}
