
import { GoogleGenAI } from "@google/genai";
import { Strategy, GenerationResult } from '../types';

// Initialize API Client
// Note: process.env.API_KEY is injected by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateHashtags = async (
  theme: string, 
  strategy: Strategy
): Promise<GenerationResult> => {
  try {
    const model = 'gemini-2.5-flash';
    
    // We cannot use JSON schema with Google Search tool, so we enforce a strict text format
    const systemInstruction = `You are an expert social media manager specializing in Instagram growth. 
    Your goal is to generate a VIRAL CAPTION and the best hashtags for a user's post.
    You MUST use Google Search to validate that tags are relevant and currently active.
    
    STRICT OUTPUT FORMAT:
    1. Start with the header "## CAPTION" followed by a highly engaging, hook-based caption (max 2 sentences) with 1-2 emojis.
    2. Next, use the header "## HASHTAGS" followed by the hashtags grouped by category.
    3. Finally, use the header "## ANALYSIS" followed by a brief strategy breakdown.
    `;

    const userPrompt = `Theme: "${theme}"
    Strategy: ${strategy.name}
    Strategy Rules: ${strategy.promptContext}
    
    Task:
    1. Write a viral caption.
    2. Search for current trends related to "${theme}".
    3. Provide optimized hashtags based on the strategy.
    4. explain the choice.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    const text = response.text || "No suggestions generated.";
    
    // Extract sources if available
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map(chunk => {
        if (chunk.web) {
          return { title: chunk.web.title, uri: chunk.web.uri };
        }
        return null;
      })
      .filter((s): s is { title: string; uri: string } => s !== null);

    // Parse the structured text
    const captionMatch = text.match(/## CAPTION\s*([\s\S]*?)(?=## HASHTAGS|$)/i);
    const hashtagsMatch = text.match(/## HASHTAGS\s*([\s\S]*?)(?=## ANALYSIS|$)/i);
    const analysisMatch = text.match(/## ANALYSIS\s*([\s\S]*?)(?=$)/i);

    const caption = captionMatch ? captionMatch[1].trim() : "Could not generate caption.";
    const analysis = analysisMatch ? analysisMatch[1].trim() : (hashtagsMatch ? "" : text); // Fallback if format fails

    // Extract hashtags from the whole text or just the hashtag section to be safe
    const hashtagSourceText = hashtagsMatch ? hashtagsMatch[1] : text;
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const extractedTags = hashtagSourceText.match(hashtagRegex) || [];
    const uniqueTags = Array.from(new Set(extractedTags)) as string[];

    return {
      caption: caption,
      rawText: text,
      analysis: analysis,
      hashtags: uniqueTags,
      sources: sources,
      strategyUsed: strategy.id
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate content. Please check your connection or try a different theme.");
  }
};
