import { Router, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

interface ExtractedBet {
    number: string;
    amount: number;
    original: string;
    isPermutation: boolean;
}

// POST /api/scan - Extract bets from image using Gemini
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { image } = req.body as { image?: string };

        if (!image) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY is not set');
            return res.status(500).json({ error: 'AI service not configured' });
        }

        const client = new GoogleGenAI({ apiKey });

        // Normalize base64 input: strip data URL prefix if present
        const base64Data = image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

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

        const result = await client.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: base64Data,
                            },
                        },
                    ],
                },
            ],
        });

        const text = (result as any)?.text ?? (result as any)?.response?.text?.();
        if (!text) {
            return res.json({ bets: [] });
        }

        let parsed: any[] = [];
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            // If the model didn't return valid JSON, return empty result gracefully
            return res.json({ bets: [] });
        }

        const bets: ExtractedBet[] = parsed
            .filter((item: any) => item && item.number && item.amount !== undefined)
            .map((item: any) => ({
                number: String(item.number).padStart(3, '0').slice(-3),
                amount: Number(item.amount) || 0,
                isPermutation: Boolean(item.isPermutation),
                original: `${item.number}${item.isPermutation ? 'R' : '-'}${item.amount}`,
            }));

        res.json({ bets });
    } catch (error: any) {
        console.error('Scan error:', error);
        // Surface permission issues to the client for easier troubleshooting
        if (error?.status === 403) {
            return res.status(403).json({ error: 'AI key forbidden (403). Check Gemini API key and project access.' });
        }
        res.status(500).json({ error: 'Failed to process image' });
    }
});

export default router;
