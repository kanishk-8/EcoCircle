import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useAuth } from "@/context/authcontext";
import { usePosts } from "@/context/postsContext";
import { dailyAnalyticsService } from "@/services/dailyAnalyticsService";

const screenWidth = Dimensions.get("window").width;

const Home = () => {
  const { isUser, session } = useAuth();
  const { posts } = usePosts();
  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [challengeLoading, setChallengeLoading] = useState(false);

  const quickActions = [
    {
      id: "1",
      title: "Plant a Tree",
      icon: "park",
      color: "#4CAF50",
      description: "Log your tree planting activity",
    },
    {
      id: "2",
      title: "Recycle",
      icon: "recycling",
      color: "#FF9800",
      description: "Track your recycling efforts",
    },
    {
      id: "3",
      title: "Save Energy",
      icon: "bolt",
      color: "#2196F3",
      description: "Monitor energy conservation",
    },
    {
      id: "4",
      title: "Water Conservation",
      icon: "water-drop",
      color: "#00BCD4",
      description: "Log water saving activities",
    },
  ];

  // Load daily data on component mount
  useEffect(() => {
    if (isUser) {
      loadDailyData();
    }
  }, [isUser]);

  const loadDailyData = async () => {
    try {
      setLoading(true);
      const data = await dailyAnalyticsService.getDailyData();
      setDailyData(data);
    } catch (error) {
      console.error("Error loading daily data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteChallenge = async () => {
    if (!dailyData?.challenge) return;

    try {
      setChallengeLoading(true);
      const success = await dailyAnalyticsService.completeChallenge(
        dailyData.challenge.id,
        100,
      );

      if (success) {
        // Update local state
        setDailyData((prev) => ({
          ...prev,
          challenge: {
            ...prev.challenge,
            completed: true,
            progress: 100,
          },
        }));

        Alert.alert(
          "Challenge Completed! 🎉",
          `Great job! You earned ${dailyData.challenge.points} eco points.`,
          [{ text: "Awesome!", style: "default" }],
        );
      }
    } catch (error) {
      console.error("Error completing challenge:", error);
      Alert.alert("Error", "Failed to complete challenge. Please try again.");
    } finally {
      setChallengeLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#4CAF50";
    if (score >= 60) return "#FF9800";
    if (score >= 40) return "#FFC107";
    return "#F44336";
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return "#4CAF50";
      case "medium":
        return "#FF9800";
      case "hard":
        return "#F44336";
      default:
        return "#4CAF50";
    }
  };

  // Custom Header Component
  const CustomHeader = () => (
    <SafeAreaView style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <View style={styles.headerRow}>
          <View style={styles.titleSection}>
            <Text style={styles.headerTitle}>EcoCircle</Text>
            <Text style={styles.headerSubtitle}>
              Track your environmental impact
            </Text>
          </View>
          <MaterialIcons name="eco" size={32} color="#4abd3e" />
        </View>
      </View>
    </SafeAreaView>
  );

  if (!isUser) {
    return (
      <View style={styles.loginContainer}>
        <MaterialIcons name="eco" size={100} color="#4abd3e" />
        <Text style={styles.loginTitle}>Welcome to EcoCircle</Text>
        <Text style={styles.loginSubtitle}>
          Join our community to track your environmental impact and share your
          journey
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <CustomHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4abd3e" />
          <Text style={styles.loadingText}>Loading your eco data...</Text>
        </View>
      </View>
    );
  }

  const userStats = [
    {
      label: "Eco Score",
      value: dailyData?.ecoScore?.score || 0,
      icon: "eco",
      suffix: "/100",
    },
    {
      label: "Streak",
      value: dailyData?.ecoScore?.streak || 0,
      icon: "local-fire-department",
      suffix: " days",
    },
    {
      label: "Posts",
      value: posts?.length || 0,
      icon: "article",
      suffix: "",
    },
    {
      label: "Level",
      value: dailyData?.ecoScore?.level?.split(" ")[1] || "Novice",
      icon: "star",
      suffix: "",
    },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <CustomHeader />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome back,{" "}
            {session?.user?.user_metadata?.full_name || "Eco Warrior"}!{" "}
            {dailyData?.ecoScore?.badge || "🌱"}
          </Text>
          <Text style={styles.welcomeSubtext}>
            {dailyData?.ecoScore?.level ||
              "Ready to make a positive impact today?"}
          </Text>
        </View>

        {/* Eco Score Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Eco Impact</Text>
          <View style={styles.statsGrid}>
            {userStats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <MaterialIcons
                  name={stat.icon}
                  size={24}
                  color={
                    stat.icon === "eco" ? getScoreColor(stat.value) : "#4abd3e"
                  }
                />
                <Text
                  style={[
                    styles.statValue,
                    stat.icon === "eco" && { color: getScoreColor(stat.value) },
                  ]}
                >
                  {stat.value}
                  {stat.suffix}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Achievements */}
          {dailyData?.ecoScore?.achievements?.length > 0 && (
            <View style={styles.achievementsContainer}>
              <Text style={styles.achievementsTitle}>
                🏆 Recent Achievements
              </Text>
              {dailyData.ecoScore.achievements.map((achievement, index) => (
                <Text key={index} style={styles.achievementText}>
                  • {achievement}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Today's Challenge */}
        {dailyData?.challenge && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today&apos;s Challenge</Text>
            <View style={styles.challengeCard}>
              <View style={styles.challengeHeader}>
                <MaterialIcons name="emoji-events" size={24} color="#FFD700" />
                <Text style={styles.challengeTitle}>
                  {dailyData.challenge.title}
                </Text>
                <View
                  style={[
                    styles.difficultyBadge,
                    {
                      backgroundColor: getDifficultyColor(
                        dailyData.challenge.difficulty,
                      ),
                    },
                  ]}
                >
                  <Text style={styles.difficultyText}>
                    {dailyData.challenge.difficulty.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.challengeDescription}>
                {dailyData.challenge.description}
              </Text>
              <View style={styles.challengeProgress}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${dailyData.challenge.progress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {dailyData.challenge.progress}% complete •{" "}
                  {dailyData.challenge.points} points
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.challengeButton,
                  dailyData.challenge.completed &&
                    styles.challengeButtonCompleted,
                ]}
                onPress={handleCompleteChallenge}
                disabled={dailyData.challenge.completed || challengeLoading}
              >
                {challengeLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.challengeButtonText}>
                    {dailyData.challenge.completed
                      ? "Completed! ✅"
                      : "Mark Complete"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity key={action.id} style={styles.actionCard}>
                <View
                  style={[styles.actionIcon, { backgroundColor: action.color }]}
                >
                  <MaterialIcons name={action.icon} size={24} color="white" />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>
                  {action.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Daily Tip */}
        {dailyData?.tip && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Eco Tip</Text>
            <View style={styles.tipCard}>
              <Text style={styles.tipIcon}>{dailyData.tip.icon}</Text>
              <Text style={styles.tipText}>{dailyData.tip.content}</Text>
            </View>
          </View>
        )}

        {/* Improvement Areas */}
        {dailyData?.ecoScore?.improvement_areas?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Growth Opportunities</Text>
            <View style={styles.improvementCard}>
              {dailyData.ecoScore.improvement_areas.map((area, index) => (
                <View key={index} style={styles.improvementItem}>
                  <MaterialIcons name="trending-up" size={16} color="#4abd3e" />
                  <Text style={styles.improvementText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },

  // Header Styles
  headerContainer: {
    backgroundColor: "white",
    paddingTop: 45,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#7f8c8d",
    fontWeight: "500",
  },

  content: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 100, // Space for bottom tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  welcomeSection: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: "#7f8c8d",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "white",
    width: (screenWidth - 48) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4abd3e",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  achievementsContainer: {
    backgroundColor: "#f0f8ff",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  achievementsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  achievementText: {
    fontSize: 14,
    color: "#4abd3e",
    marginBottom: 4,
  },
  challengeCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginLeft: 12,
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  challengeDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 16,
  },
  challengeProgress: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e9ecef",
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4abd3e",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
  },
  challengeButton: {
    backgroundColor: "#4abd3e",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  challengeButtonCompleted: {
    backgroundColor: "#28a745",
  },
  challengeButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    backgroundColor: "white",
    width: (screenWidth - 48) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  tipCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#2c3e50",
    lineHeight: 20,
  },
  improvementCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  improvementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  improvementText: {
    flex: 1,
    fontSize: 14,
    color: "#2c3e50",
    marginLeft: 8,
    lineHeight: 20,
  },
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 32,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2c3e50",
    marginTop: 24,
    marginBottom: 12,
    textAlign: "center",
  },
  loginSubtitle: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    lineHeight: 24,
  },
});

export default Home;
