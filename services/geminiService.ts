import { GoogleGenAI, Type } from "@google/genai";

export interface ExtractedBet {
  number: string;
  amount: number;
  original: string;
  isPermutation: boolean;
}

export const extractBetsFromImage = async (base64Image: string): Promise<ExtractedBet[]> => {
  // Use a fresh instance to ensure correct API key usage
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Fix: Use 'gemini-3-flash-preview' for basic text extraction tasks from images
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Extract lottery betting data from this image. 
    Look for patterns like:
    - "123-500" (number 123, amount 500)
    - "456R1000" (number 456, permutation/reverse, amount 1000)
    - "789/200" (number 789, amount 200)
    
    Return a JSON array of objects with keys: "number", "amount", "isPermutation".
    - "number" must be exactly 3 digits.
    - "amount" must be an integer.
    - "isPermutation" is true if 'R' or 'r' is present, otherwise false.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              isPermutation: { type: Type.BOOLEAN },
            },
            required: ["number", "amount", "isPermutation"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    
    const parsed = JSON.parse(text);
    return parsed.map((item: any) => ({
      ...item,
      original: `${item.number}${item.isPermutation ? 'R' : '-'}${item.amount}`
    }));
  } catch (error: any) {
    console.error("Gemini OCR Error:", error);
    // Log more details if available
    if (error.message) console.error("Error Message:", error.message);
    return [];
  }
};