import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/utils/supabase";

interface DailyTip {
  id: string;
  content: string;
  icon: string;
  category: "energy" | "water" | "transport" | "waste" | "general";
  generated_at: string;
}

interface EcoScore {
  score: number;
  streak: number;
  level: string;
  badge: string;
  improvement_areas: string[];
  achievements: string[];
  generated_at: string;
}

interface UserActivity {
  posts_count: number;
  categories: string[];
  recent_content: string[];
  image_activities: number;
  engagement: number;
}

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  completed: boolean;
  progress: number;
  generated_at: string;
}

class DailyAnalyticsService {
  private genAI: GoogleGenAI;
  private lastUpdateKey = "last_daily_update";
  private dailyTipKey = "daily_tip";
  private ecoScoreKey = "eco_score";
  private dailyChallengeKey = "daily_challenge";

  constructor() {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("EXPO_PUBLIC_GEMINI_API_KEY is required");
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  /**
   * Check if daily update is needed (after 12 PM)
   */
  private async shouldUpdateDaily(): Promise<boolean> {
    try {
      const lastUpdate = await AsyncStorage.getItem(this.lastUpdateKey);
      const now = new Date();
      const currentHour = now.getHours();

      // Only update after 12 PM (noon)
      if (currentHour < 12) {
        return false;
      }

      if (!lastUpdate) {
        return true;
      }

      const lastUpdateDate = new Date(lastUpdate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      lastUpdateDate.setHours(0, 0, 0, 0);

      // Check if last update was before today
      return lastUpdateDate < today;
    } catch (error) {
      console.error("Error checking daily update status:", error);
      return false;
    }
  }

  /**
   * Get user's recent activity data
   */
  private async getUserActivity(): Promise<UserActivity> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get user's posts from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: posts } = await supabase
        .from("posts_with_stats")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (!posts) {
        return {
          posts_count: 0,
          categories: [],
          recent_content: [],
          image_activities: 0,
          engagement: 0,
        };
      }

      const categories = [
        ...new Set(posts.map((p) => p.category).filter(Boolean)),
      ];
      const recent_content = posts
        .slice(0, 10)
        .map((p) => `${p.title || ""} ${p.content || ""}`.trim())
        .filter((content) => content.length > 0);

      const image_activities = posts.filter((p) => p.image_url).length;
      const engagement = posts.reduce(
        (sum, p) => sum + (p.like_count || 0) + (p.comment_count || 0),
        0,
      );

      return {
        posts_count: posts.length,
        categories,
        recent_content,
        image_activities,
        engagement,
      };
    } catch (error) {
      console.error("Error getting user activity:", error);
      return {
        posts_count: 0,
        categories: [],
        recent_content: [],
        image_activities: 0,
        engagement: 0,
      };
    }
  }

  /**
   * Generate daily eco score using Gemini
   */
  private async generateEcoScore(activity: UserActivity): Promise<EcoScore> {
    const prompt = `
You are an environmental impact analyst for EcoCircle app. Analyze the user's activity and generate a comprehensive eco score.

USER ACTIVITY DATA:
- Posts in last 30 days: ${activity.posts_count}
- Categories engaged: ${activity.categories.join(", ") || "None"}
- Recent content samples: ${activity.recent_content.slice(0, 3).join(" | ") || "No content"}
- Posts with images: ${activity.image_activities}
- Total engagement received: ${activity.engagement}

SCORING CRITERIA:
- Content Quality: Relevance to environmental topics, depth of insights
- Consistency: Regular posting and engagement with eco topics
- Diversity: Variety of environmental categories covered
- Impact: Educational value and inspiration to others
- Community: Engagement and interactions with other users

LEVELS:
- Eco Novice (0-25): Just starting the eco journey
- Green Explorer (26-50): Learning and exploring sustainability
- Eco Advocate (51-75): Actively promoting environmental awareness
- Green Guardian (76-90): Strong environmental leader
- Eco Champion (91-100): Exceptional environmental impact

Generate a JSON response:
{
  "score": number (0-100),
  "streak": number (days of consistent activity, max 30),
  "level": string (one of the levels above),
  "badge": string (emoji representing achievement),
  "improvement_areas": [array of 2-3 specific suggestions],
  "achievements": [array of 1-2 recent accomplishments]
}
`;

    try {
      const response = await this.genAI.models.generateContent({
        model: "gemini-2.0-flash-001",
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 600,
          responseMimeType: "application/json",
        },
      });

      const result = JSON.parse(response.text || "{}");

      return {
        score: Math.max(0, Math.min(100, result.score || 0)),
        streak: Math.max(0, Math.min(30, result.streak || 0)),
        level: result.level || "Eco Novice",
        badge: result.badge || "🌱",
        improvement_areas: Array.isArray(result.improvement_areas)
          ? result.improvement_areas.slice(0, 3)
          : [
              "Stay consistent with eco-friendly posts",
              "Share more diverse environmental content",
            ],
        achievements: Array.isArray(result.achievements)
          ? result.achievements.slice(0, 2)
          : ["Started your eco journey!"],
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error generating eco score:", error);

      // Fallback calculation
      let score = 0;
      score += Math.min(30, activity.posts_count * 2); // Max 30 for posts
      score += Math.min(20, activity.categories.length * 5); // Max 20 for diversity
      score += Math.min(25, activity.engagement * 0.5); // Max 25 for engagement
      score += Math.min(25, activity.image_activities * 3); // Max 25 for visual content

      return {
        score: Math.round(score),
        streak: Math.min(activity.posts_count, 7),
        level:
          score > 75
            ? "Eco Advocate"
            : score > 50
              ? "Green Explorer"
              : "Eco Novice",
        badge: score > 75 ? "🌟" : score > 50 ? "🌿" : "🌱",
        improvement_areas: [
          "Post more consistently about environmental topics",
          "Engage with different sustainability categories",
        ],
        achievements:
          activity.posts_count > 0
            ? ["Active community member"]
            : ["Welcome to EcoCircle!"],
        generated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate personalized daily tip using Gemini
   */
  private async generateDailyTip(
    activity: UserActivity,
    ecoScore: EcoScore,
  ): Promise<DailyTip> {
    const prompt = `
You are an environmental coach for EcoCircle app. Generate a personalized daily tip for the user.

USER CONTEXT:
- Eco Score: ${ecoScore.score}/100 (${ecoScore.level})
- Recent categories: ${activity.categories.join(", ") || "None"}
- Activity level: ${activity.posts_count > 10 ? "High" : activity.posts_count > 3 ? "Medium" : "Low"}
- Improvement areas: ${ecoScore.improvement_areas.join(", ")}

GUIDELINES:
- Make it actionable and specific
- Keep it under 100 characters
- Make it inspiring and positive
- Tailor to their current level and interests
- Focus on practical daily actions

TIP CATEGORIES:
- energy: Energy conservation tips
- water: Water saving advice
- transport: Sustainable transportation
- waste: Waste reduction and recycling
- general: General sustainability practices

Generate a JSON response:
{
  "content": "Practical daily tip (under 100 chars)",
  "icon": "relevant emoji",
  "category": "one of the categories above"
}
`;

    try {
      const response = await this.genAI.models.generateContent({
        model: "gemini-2.0-flash-001",
        contents: prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 200,
          responseMimeType: "application/json",
        },
      });

      const result = JSON.parse(response.text || "{}");

      return {
        id: `tip_${Date.now()}`,
        content:
          result.content ||
          "Turn off lights when leaving a room to save energy!",
        icon: result.icon || "💡",
        category:
          (result.category as
            | "energy"
            | "water"
            | "transport"
            | "waste"
            | "general") || "general",
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error generating daily tip:", error);

      const fallbackTips: {
        content: string;
        icon: string;
        category: "energy" | "water" | "transport" | "waste" | "general";
      }[] = [
        {
          content: "Use a reusable water bottle instead of plastic ones today!",
          icon: "💧",
          category: "waste",
        },
        {
          content:
            "Walk or bike for short trips to reduce your carbon footprint",
          icon: "🚲",
          category: "transport",
        },
        {
          content: "Unplug devices when not in use to save energy",
          icon: "🔌",
          category: "energy",
        },
        {
          content: "Take shorter showers to conserve water",
          icon: "🚿",
          category: "water",
        },
        {
          content: "Bring your own bag when shopping to reduce plastic waste",
          icon: "🛍️",
          category: "waste",
        },
      ];

      const randomTip =
        fallbackTips[Math.floor(Math.random() * fallbackTips.length)];

      return {
        id: `tip_${Date.now()}`,
        content: randomTip.content,
        icon: randomTip.icon,
        category: randomTip.category as
          | "energy"
          | "water"
          | "transport"
          | "waste"
          | "general",
        generated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate daily challenge using Gemini
   */
  private async generateDailyChallenge(
    activity: UserActivity,
    ecoScore: EcoScore,
  ): Promise<DailyChallenge> {
    const prompt = `
You are a gamification expert for EcoCircle app. Create an engaging daily challenge for the user.

USER CONTEXT:
- Eco Score: ${ecoScore.score}/100 (${ecoScore.level})
- Active categories: ${activity.categories.join(", ") || "None"}
- Recent activity: ${activity.posts_count} posts in 30 days
- Improvement focus: ${ecoScore.improvement_areas[0] || "General sustainability"}

CHALLENGE REQUIREMENTS:
- Achievable in one day
- Specific and measurable
- Environmentally focused
- Appropriate difficulty for user's level
- Engaging and motivating

DIFFICULTY LEVELS:
- easy: Simple 5-10 minute actions (10-20 points)
- medium: 30-60 minute commitments (25-40 points)
- hard: Half-day or complex challenges (45-60 points)

Generate a JSON response:
{
  "title": "Challenge name (under 50 chars)",
  "description": "Clear description of what to do (under 150 chars)",
  "category": "energy|water|transport|waste|nature|community",
  "difficulty": "easy|medium|hard",
  "points": number (based on difficulty)
}
`;

    try {
      const response = await this.genAI.models.generateContent({
        model: "gemini-2.0-flash-001",
        contents: prompt,
        config: {
          temperature: 0.8,
          maxOutputTokens: 300,
          responseMimeType: "application/json",
        },
      });

      const result = JSON.parse(response.text || "{}");

      return {
        id: `challenge_${Date.now()}`,
        title: result.title || "Eco Action Challenge",
        description:
          result.description ||
          "Complete one environmentally friendly action today",
        category: result.category || "general",
        difficulty: result.difficulty || "easy",
        points: result.points || 15,
        completed: false,
        progress: 0,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error generating daily challenge:", error);

      const fallbackChallenges = [
        {
          title: "Energy Saver",
          description: "Turn off all unused electronics for 2 hours",
          category: "energy",
          difficulty: "easy" as const,
          points: 15,
        },
        {
          title: "Plastic-Free Hour",
          description: "Avoid using any single-use plastic for 1 hour",
          category: "waste",
          difficulty: "medium" as const,
          points: 30,
        },
        {
          title: "Green Commute",
          description: "Use public transport, bike, or walk instead of driving",
          category: "transport",
          difficulty: "medium" as const,
          points: 35,
        },
      ];

      const randomChallenge =
        fallbackChallenges[
          Math.floor(Math.random() * fallbackChallenges.length)
        ];

      return {
        id: `challenge_${Date.now()}`,
        ...randomChallenge,
        completed: false,
        progress: 0,
        generated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Perform daily update - generate new tip, score, and challenge
   */
  async performDailyUpdate(): Promise<{
    tip: DailyTip;
    ecoScore: EcoScore;
    challenge: DailyChallenge;
    updated: boolean;
  }> {
    try {
      const shouldUpdate = await this.shouldUpdateDaily();

      if (!shouldUpdate) {
        // Return cached data
        const cachedData = await this.getCachedDailyData();
        return {
          ...cachedData,
          updated: false,
        };
      }

      console.log("🔄 Performing daily analytics update...");

      // Get user activity
      const activity = await this.getUserActivity();

      // Generate new eco score
      const ecoScore = await this.generateEcoScore(activity);

      // Generate new daily tip
      const tip = await this.generateDailyTip(activity, ecoScore);

      // Generate new daily challenge
      const challenge = await this.generateDailyChallenge(activity, ecoScore);

      // Cache the results
      await this.cacheDailyData({ tip, ecoScore, challenge });

      // Update last update timestamp
      await AsyncStorage.setItem(this.lastUpdateKey, new Date().toISOString());

      console.log("✅ Daily analytics update completed");

      return {
        tip,
        ecoScore,
        challenge,
        updated: true,
      };
    } catch (error) {
      console.error("Error performing daily update:", error);

      // Return cached data or fallbacks
      const cachedData = await this.getCachedDailyData();
      return {
        ...cachedData,
        updated: false,
      };
    }
  }

  /**
   * Cache daily data to AsyncStorage
   */
  private async cacheDailyData(data: {
    tip: DailyTip;
    ecoScore: EcoScore;
    challenge: DailyChallenge;
  }): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.dailyTipKey, JSON.stringify(data.tip)),
        AsyncStorage.setItem(this.ecoScoreKey, JSON.stringify(data.ecoScore)),
        AsyncStorage.setItem(
          this.dailyChallengeKey,
          JSON.stringify(data.challenge),
        ),
      ]);
    } catch (error) {
      console.error("Error caching daily data:", error);
    }
  }

  /**
   * Get cached daily data
   */
  private async getCachedDailyData(): Promise<{
    tip: DailyTip;
    ecoScore: EcoScore;
    challenge: DailyChallenge;
  }> {
    try {
      const [tipData, scoreData, challengeData] = await Promise.all([
        AsyncStorage.getItem(this.dailyTipKey),
        AsyncStorage.getItem(this.ecoScoreKey),
        AsyncStorage.getItem(this.dailyChallengeKey),
      ]);

      const tip = tipData ? JSON.parse(tipData) : this.getDefaultTip();
      const ecoScore = scoreData
        ? JSON.parse(scoreData)
        : this.getDefaultEcoScore();
      const challenge = challengeData
        ? JSON.parse(challengeData)
        : this.getDefaultChallenge();

      return { tip, ecoScore, challenge };
    } catch (error) {
      console.error("Error getting cached data:", error);
      return {
        tip: this.getDefaultTip(),
        ecoScore: this.getDefaultEcoScore(),
        challenge: this.getDefaultChallenge(),
      };
    }
  }

  /**
   * Get daily data (cached or generate new)
   */
  async getDailyData(): Promise<{
    tip: DailyTip;
    ecoScore: EcoScore;
    challenge: DailyChallenge;
  }> {
    const result = await this.performDailyUpdate();
    return {
      tip: result.tip,
      ecoScore: result.ecoScore,
      challenge: result.challenge,
    };
  }

  /**
   * Mark challenge as completed
   */
  async completeChallenge(
    challengeId: string,
    progress: number = 100,
  ): Promise<boolean> {
    try {
      const challengeData = await AsyncStorage.getItem(this.dailyChallengeKey);
      if (!challengeData) return false;

      const challenge: DailyChallenge = JSON.parse(challengeData);
      if (challenge.id !== challengeId) return false;

      challenge.completed = progress >= 100;
      challenge.progress = Math.min(100, Math.max(0, progress));

      await AsyncStorage.setItem(
        this.dailyChallengeKey,
        JSON.stringify(challenge),
      );
      return true;
    } catch (error) {
      console.error("Error completing challenge:", error);
      return false;
    }
  }

  /**
   * Default data when no cache exists
   */
  private getDefaultTip(): DailyTip {
    return {
      id: "default_tip",
      content: "Welcome to EcoCircle! Start your green journey today 🌱",
      icon: "🌱",
      category: "general",
      generated_at: new Date().toISOString(),
    };
  }

  private getDefaultEcoScore(): EcoScore {
    return {
      score: 0,
      streak: 0,
      level: "Eco Novice",
      badge: "🌱",
      improvement_areas: [
        "Start sharing eco-friendly content",
        "Join the community discussions",
      ],
      achievements: ["Welcome to EcoCircle!"],
      generated_at: new Date().toISOString(),
    };
  }

  private getDefaultChallenge(): DailyChallenge {
    return {
      id: "default_challenge",
      title: "First Steps",
      description: "Create your first eco-friendly post to get started!",
      category: "community",
      difficulty: "easy",
      points: 20,
      completed: false,
      progress: 0,
      generated_at: new Date().toISOString(),
    };
  }
}

export const dailyAnalyticsService = new DailyAnalyticsService();
export default dailyAnalyticsService;
export type { DailyTip, EcoScore, DailyChallenge, UserActivity };
