import { GoogleGenAI } from "@google/genai";

interface ValidationResult {
  isValid: boolean;
  isEcoRelated: boolean;
  confidence: number;
  reasons: string[];
  suggestions?: string[];
  category?: string;
}

interface EcoRelevanceResult {
  isEcoRelated: boolean;
  confidence: number;
  category: string;
  reasoning: string;
}

interface ContentModerationResult {
  isAppropriate: boolean;
  confidence: number;
  violations: string[];
  reasoning: string;
}

class GeminiValidationService {
  private genAI: GoogleGenAI;

  constructor() {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "EXPO_PUBLIC_GEMINI_API_KEY is not set in environment variables",
      );
    }

    this.genAI = new GoogleGenAI({ apiKey });
  }

  /**
   * Validates if post content is appropriate for the eco-friendly community app
   */
  async validatePostContent(
    content: string,
    title?: string,
    category?: string,
    imageUri?: string,
  ): Promise<ValidationResult> {
    try {
      console.log("🌱 Starting Gemini validation for post content...");

      // Check eco-relevance
      const ecoCheck = await this.checkEcoRelevance(
        content,
        title,
        category,
        imageUri,
      );

      // Check content appropriateness
      const moderationCheck = await this.checkContentModeration(
        content,
        title,
        imageUri,
      );

      // Combine results
      const isValid = ecoCheck.isEcoRelated && moderationCheck.isAppropriate;
      const reasons: string[] = [];

      if (!ecoCheck.isEcoRelated) {
        reasons.push(
          `Content is not related to environment or sustainability (${ecoCheck.reasoning})`,
        );
      }

      if (!moderationCheck.isAppropriate) {
        reasons.push(...moderationCheck.violations);
      }

      const result: ValidationResult = {
        isValid,
        isEcoRelated: ecoCheck.isEcoRelated,
        confidence: Math.min(ecoCheck.confidence, moderationCheck.confidence),
        reasons,
        category: ecoCheck.category,
        suggestions: isValid
          ? undefined
          : await this.generateSuggestions(content, reasons),
      };

      console.log("✅ Gemini validation completed:", {
        isValid,
        isEcoRelated: ecoCheck.isEcoRelated,
      });
      return result;
    } catch (error) {
      console.error("❌ Error in Gemini validation:", error);

      // Return permissive result on error to avoid blocking users
      return {
        isValid: true,
        isEcoRelated: true,
        confidence: 0.1,
        reasons: ["Validation service temporarily unavailable"],
        suggestions: [
          "Please ensure your post is related to environmental sustainability",
        ],
      };
    }
  }

  /**
   * Checks if content is related to environment and sustainability
   */
  private async checkEcoRelevance(
    content: string,
    title?: string,
    category?: string,
    imageUri?: string,
  ): Promise<EcoRelevanceResult> {
    const prompt = `
You are an expert environmental content moderator for EcoCircle, a sustainability-focused social media app.

Analyze the following post content and determine if it's related to environmental sustainability, nature conservation, eco-friendly living, or green initiatives.

POST CONTENT:
Title: ${title || "No title"}
Content: ${content}
Category: ${category || "General"}
${imageUri ? "Image: Included (analyze the image content)" : "Image: None"}

EVALUATION CRITERIA:
✅ RELEVANT TOPICS include:
- Environmental conservation and protection
- Sustainable living practices
- Renewable energy and green technology
- Climate change awareness and action
- Waste reduction and recycling
- Biodiversity and wildlife protection
- Eco-friendly products and lifestyle
- Green transportation
- Water and energy conservation
- Organic farming and gardening
- Environmental education and awareness
- Nature photography and outdoor activities
- Environmental challenges and solutions

❌ IRRELEVANT TOPICS include:
- Generic lifestyle posts unrelated to environment
- Pure entertainment content
- Commercial promotions without eco focus
- Personal drama or relationships
- Non-environmental health topics
- General technology without green focus
- Sports and games unrelated to nature
- Fashion without sustainability angle

Respond with a JSON object:
{
  "isEcoRelated": boolean,
  "confidence": number (0-1),
  "category": string (one of: "Conservation", "Sustainable Living", "Green Technology", "Climate Action", "Waste Management", "Nature", "Education", "Not Eco-Related"),
  "reasoning": string (brief explanation)
}
`;

    try {
      // Prepare content parts
      const parts: any[] = [{ text: prompt }];

      // Add image if provided
      if (imageUri) {
        try {
          // Convert image URI to base64
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const reader = new FileReader();

          const base64Data = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(",")[1]; // Remove data:image/...;base64, prefix
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          });
        } catch (imageError) {
          console.warn("Failed to process image for validation:", imageError);
          // Continue without image
        }
      }

      const response = await this.genAI.models.generateContent({
        model: "gemini-2.0-flash-001",
        contents: parts,
        config: {
          temperature: 0.3,
          maxOutputTokens: 500,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "";
      const parsed = JSON.parse(text);

      return {
        isEcoRelated: parsed.isEcoRelated || false,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        category: parsed.category || "General",
        reasoning: parsed.reasoning || "No reasoning provided",
      };
    } catch (error) {
      console.error("Error checking eco relevance:", error);

      // Simple keyword fallback
      const ecoKeywords = [
        "environment",
        "eco",
        "green",
        "sustainable",
        "climate",
        "nature",
        "renewable",
        "recycl",
        "conservation",
        "organic",
        "solar",
        "waste",
        "carbon",
        "biodiversity",
        "pollution",
        "clean energy",
        "tree",
        "plant",
      ];

      const fullText = `${title} ${content}`.toLowerCase();
      const hasEcoKeywords = ecoKeywords.some((keyword) =>
        fullText.includes(keyword),
      );

      return {
        isEcoRelated: hasEcoKeywords,
        confidence: hasEcoKeywords ? 0.6 : 0.3,
        category: hasEcoKeywords ? "General" : "Not Eco-Related",
        reasoning: "Fallback keyword analysis due to API error",
      };
    }
  }

  /**
   * Checks if content is appropriate and doesn't violate community guidelines
   */
  private async checkContentModeration(
    content: string,
    title?: string,
    imageUri?: string,
  ): Promise<ContentModerationResult> {
    const prompt = `
You are a content moderator for EcoCircle, a positive environmental community app.

Analyze the following content for appropriateness and community guideline violations.

CONTENT TO ANALYZE:
Title: ${title || "No title"}
Content: ${content}
${imageUri ? "Image: Included (analyze the image for inappropriate content)" : "Image: None"}

CHECK FOR VIOLATIONS:
❌ INAPPROPRIATE CONTENT:
- Hate speech, discrimination, or harassment
- Explicit violence or harmful content
- Spam or excessive self-promotion
- Misinformation about environmental topics
- Offensive language or personal attacks
- Content that could harm others
- Inappropriate sexual content
- Illegal activities or dangerous behaviors
- Images containing offensive gestures or symbols
- Images with inappropriate text or signs
- Images showing harmful environmental practices as positive

✅ APPROPRIATE CONTENT:
- Positive environmental discussions
- Educational content about sustainability
- Personal eco-friendly experiences
- Constructive environmental debates
- Nature appreciation and conservation
- Green lifestyle tips and advice
- Environmental news and updates
- Community building around eco topics

Respond with a JSON object:
{
  "isAppropriate": boolean,
  "confidence": number (0-1),
  "violations": array of strings (specific violations found, empty if none),
  "reasoning": string (brief explanation)
}
`;

    try {
      // Prepare content parts
      const parts: any[] = [{ text: prompt }];

      // Add image if provided
      if (imageUri) {
        try {
          // Convert image URI to base64
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const reader = new FileReader();

          const base64Data = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(",")[1]; // Remove data:image/...;base64, prefix
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          });
        } catch (imageError) {
          console.warn("Failed to process image for moderation:", imageError);
          // Continue without image
        }
      }

      const response = await this.genAI.models.generateContent({
        model: "gemini-2.0-flash-001",
        contents: parts,
        config: {
          temperature: 0.2,
          maxOutputTokens: 400,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "";
      const parsed = JSON.parse(text);

      return {
        isAppropriate: parsed.isAppropriate || false,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        violations: parsed.violations || [],
        reasoning: parsed.reasoning || "No reasoning provided",
      };
    } catch (error) {
      console.error("Error checking content moderation:", error);

      // Simple inappropriate content detection fallback
      const inappropriateKeywords = [
        "hate",
        "kill",
        "die",
        "stupid",
        "idiot",
        "fuck",
        "shit",
        "damn",
      ];

      const fullText = `${title} ${content}`.toLowerCase();
      const hasInappropriate = inappropriateKeywords.some((keyword) =>
        fullText.includes(keyword),
      );

      return {
        isAppropriate: !hasInappropriate,
        confidence: 0.5,
        violations: hasInappropriate
          ? ["Potentially inappropriate language detected"]
          : [],
        reasoning: "Fallback keyword analysis due to API error",
      };
    }
  }

  /**
   * Generates suggestions for improving post content
   */
  private async generateSuggestions(
    content: string,
    reasons: string[],
  ): Promise<string[]> {
    const prompt = `
The following post was rejected for these reasons:
${reasons.join("\n- ")}

Original content: "${content}"

Provide 3 helpful suggestions to improve this post for an eco-friendly community app. Keep suggestions positive and constructive.

Respond with a JSON array of strings:
["suggestion 1", "suggestion 2", "suggestion 3"]
`;

    try {
      const response = await this.genAI.models.generateContent({
        model: "gemini-2.0-flash-001",
        contents: prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 300,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "";
      const suggestions = JSON.parse(text);
      return Array.isArray(suggestions) ? suggestions : [];
    } catch (error) {
      console.error("Error generating suggestions:", error);

      return [
        "Focus on environmental or sustainability topics",
        "Share positive eco-friendly experiences or tips",
        "Use respectful language that builds community",
      ];
    }
  }

  /**
   * Quick validation for simpler use cases
   */
  async quickValidate(content: string, imageUri?: string): Promise<boolean> {
    try {
      const result = await this.validatePostContent(
        content,
        undefined,
        undefined,
        imageUri,
      );
      return result.isValid;
    } catch (error) {
      console.error("Quick validation error:", error);
      return true; // Allow post on error
    }
  }
}

export const geminiValidationService = new GeminiValidationService();
export default geminiValidationService;
