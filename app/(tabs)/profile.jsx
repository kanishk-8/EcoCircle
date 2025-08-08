import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  SafeAreaView,
} from "react-native";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/authcontext";
import { usePosts } from "@/context/postsContext";
import { MaterialIcons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import PostCard from "@/components/PostCard";
import { Stack } from "expo-router";

const Profile = () => {
  const { session, logout, isUser } = useAuth();
  const { userPosts, loading, fetchUserPosts, deletePost, toggleLike } =
    usePosts();
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("info"); // "info" or "posts"

  // Function to get user initials
  const getUserInitials = () => {
    const fullName = session?.user?.user_metadata?.full_name;
    const email = session?.user?.email;

    if (fullName) {
      // Split full name and get first letter of each word
      return fullName
        .split(" ")
        .map((name) => name.charAt(0).toUpperCase())
        .slice(0, 2) // Take only first 2 initials
        .join("");
    } else if (email) {
      // If no full name, use first letter of email and second letter if available
      const emailName = email.split("@")[0];
      return emailName.length >= 2
        ? (emailName.charAt(0) + emailName.charAt(1)).toUpperCase()
        : emailName.charAt(0).toUpperCase();
    }
    return "U"; // Default fallback
  };

  const getUserName = () => {
    return (
      session?.user?.user_metadata?.full_name ||
      session?.user?.email?.split("@")[0] ||
      "User"
    );
  };

  const onSignOutPress = async () => {
    try {
      setSignOutLoading(true);
      await logout();
    } catch (err) {
      console.error("Error signing out: ", err);
      setSignOutLoading(false);
    }
  };

  // Load user posts when tab is switched to posts
  useEffect(() => {
    if (isUser && activeTab === "posts") {
      fetchUserPosts();
    }
  }, [isUser, activeTab, fetchUserPosts]);

  // Handle post deletion
  const handleDeletePost = async (postId) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(postId);
          } catch (error) {
            Alert.alert("Error", "Failed to delete post");
          }
        },
      },
    ]);
  };

  // Handle like functionality
  const handleLike = async (postId) => {
    try {
      await toggleLike(postId);
    } catch (error) {
      Alert.alert("Error", "Failed to toggle like");
    }
  };

  // Render individual post
  const renderPost = ({ item }) => (
    <PostCard
      post={item}
      onLike={toggleLike}
      onComment={() => {
        // TODO: Navigate to post detail with comments
        console.log("Comment on post:", item.id);
      }}
      onDelete={deletePost}
      showDeleteButton={true}
      compact={true}
    />
  );

  // Custom Header Component
  const CustomHeader = () => (
    <SafeAreaView style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <View style={styles.headerRow}>
          <View style={styles.titleSection}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Your eco-friendly journey</Text>
          </View>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={onSignOutPress}
            disabled={signOutLoading}
          >
            <MaterialIcons name="logout" size={20} color="white" />
            <Text style={styles.signOutText}>
              {signOutLoading ? "Signing Out..." : "Sign Out"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  if (!isUser) {
    return (
      <View style={styles.container}>
        <Text>Please log in to view your profile.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <CustomHeader />
      {/* Profile Header - Compact */}
      <View style={styles.profileHeader}>
        <View style={styles.profileRow}>
          {/* Initials Circle */}
          <View style={styles.initialsContainer}>
            <Text style={styles.initialsText}>{getUserInitials()}</Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.name}>{getUserName()}</Text>
            <Text style={styles.email}>{session?.user?.email}</Text>
            <Text style={styles.memberSince}>
              Member Since:{" "}
              {new Date(session?.user?.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userPosts?.length || 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {userPosts?.reduce(
                (sum, post) => sum + (post.like_count || 0),
                0,
              ) || 0}
            </Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {userPosts?.reduce(
                (sum, post) => sum + (post.comment_count || 0),
                0,
              ) || 0}
            </Text>
            <Text style={styles.statLabel}>Comments</Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "info" && styles.activeTab]}
          onPress={() => setActiveTab("info")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "info" && styles.activeTabText,
            ]}
          >
            Info
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "posts" && styles.activeTab]}
          onPress={() => setActiveTab("posts")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "posts" && styles.activeTabText,
            ]}
          >
            Posts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === "info" ? (
          <ScrollView
            style={styles.infoContainer}
            contentContainerStyle={styles.infoScrollContainer}
          >
            {/* Contribution Section */}
            <View style={styles.contributionSection}>
              <Text style={styles.sectionTitle}>
                Nature Well-being Contributions
              </Text>
              <Text style={styles.contributionText}>
                🌳 Planted 5 trees this month
              </Text>
              <Text style={styles.contributionText}>
                🌍 Reduced carbon footprint by 15% this year
              </Text>
              <Text style={styles.contributionText}>
                ♻️ Recycled 30 kg of waste last quarter
              </Text>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.postsContainer}>
            {userPosts && userPosts.length > 0 ? (
              <FlashList
                data={userPosts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                estimatedItemSize={200}
                contentContainerStyle={styles.postsListContainer}
              />
            ) : (
              <View style={styles.emptyPostsContainer}>
                <MaterialIcons name="post-add" size={80} color="#ccc" />
                <Text style={styles.emptyPostsText}>No posts yet</Text>
                <Text style={styles.emptyPostsSubtext}>
                  Share your eco-friendly journey with the community!
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
  profileHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  initialsContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4abd3e",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  initialsText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4abd3e",
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 12,
    color: "#999",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4abd3e",
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#4abd3e",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  activeTabText: {
    color: "#4abd3e",
  },
  tabContent: {
    flex: 1,
  },
  infoContainer: {
    flex: 1,
    padding: 16,
  },
  contributionSection: {
    width: "100%",
    padding: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#4abd3e",
  },
  contributionText: {
    fontSize: 15,
    marginVertical: 4,
    color: "#555",
  },
  infoScrollContainer: {
    paddingBottom: 20,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e74c3c",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  signOutText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
  },
  postsContainer: {
    flex: 1,
  },
  postsListContainer: {
    paddingBottom: 20,
  },

  emptyPostsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyPostsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptyPostsSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
});
