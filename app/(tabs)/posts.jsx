import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { useAuth } from "@/context/authcontext";
import { usePosts } from "@/context/postsContext";
import PostCard from "@/components/PostCard";
import CreatePostModal from "@/components/CreatePostModal";
import CommentModal from "@/components/CommentModal";

const Community = () => {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [selectedPostTitle, setSelectedPostTitle] = useState("");

  const { isUser } = useAuth();
  const {
    posts,
    loading,
    refreshing,
    fetchPosts,
    createPost,
    toggleLike,
    deletePost,
    error,
  } = usePosts();

  // Load posts on component mount
  useEffect(() => {
    if (isUser) {
      fetchPosts();
    }
  }, [isUser, fetchPosts]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    if (isUser) {
      fetchPosts(true);
    }
  }, [isUser, fetchPosts]);

  // Handle create post with validation feedback
  const handleCreatePost = async (postData) => {
    try {
      const success = await createPost(postData);
      if (success) {
        // Refresh posts to get the new post with proper user info
        await fetchPosts(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error creating post:", error);
      return false;
    }
  };

  // Handle comment button press
  const handleCommentPress = (postId, postTitle) => {
    setSelectedPostId(postId);
    setSelectedPostTitle(postTitle || "");
    setShowComments(true);
  };

  // Handle close comments
  const handleCloseComments = () => {
    setShowComments(false);
    setSelectedPostId(null);
    setSelectedPostTitle("");
  };

  // Custom Header Component
  const CustomHeader = () => (
    <SafeAreaView style={styles.headerContainer}>
      <View style={styles.headerContent}>
        {/* Header Title and Create Button */}
        <View style={styles.headerRow}>
          <View style={styles.titleSection}>
            <Text style={styles.headerTitle}>Community Posts</Text>
            <Text style={styles.headerSubtitle}>
              Share your eco-friendly journey
            </Text>
          </View>

          {/* Create Post Button */}
          <TouchableOpacity
            style={styles.createPostButton}
            onPress={() => setShowCreatePost(true)}
          >
            <MaterialIcons name="add" size={20} color="white" />
            <Text style={styles.createPostText}>New Post</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  // Render each post in the feed
  const renderPost = ({ item }) => (
    <PostCard
      post={item}
      onLike={toggleLike}
      onComment={() => handleCommentPress(item.id, item.title)}
      onDelete={deletePost}
      showDeleteButton={true}
    />
  );

  // Loading Component
  const LoadingComponent = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4abd3e" />
      <Text style={styles.loadingText}>Loading posts...</Text>
    </View>
  );

  if (!isUser) {
    return (
      <View style={styles.loginContainer}>
        <MaterialIcons name="eco" size={80} color="#4abd3e" />
        <Text style={styles.loginTitle}>Join the Community</Text>
        <Text style={styles.loginSubtitle}>
          Please log in to view and participate in eco-friendly discussions
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <CustomHeader />

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error" size={16} color="#e74c3c" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Create Post Bottom Sheet */}
      <CreatePostModal
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onSubmit={handleCreatePost}
        loading={loading}
      />

      {/* Posts Content */}
      <View style={styles.contentWrapper}>
        {/* Loading State */}
        {loading && !refreshing ? (
          <LoadingComponent />
        ) : (
          /* Posts List */
          <FlashList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            estimatedItemSize={300}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              !loading && (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="eco" size={80} color="#ccc" />
                  <Text style={styles.emptyText}>No posts yet</Text>
                  <Text style={styles.emptySubtext}>
                    Be the first to share something eco-friendly!
                  </Text>
                </View>
              )
            }
          />
        )}
      </View>

      {/* Comment Modal */}
      <CommentModal
        visible={showComments}
        onClose={handleCloseComments}
        postId={selectedPostId}
        postTitle={selectedPostTitle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  contentWrapper: {
    flex: 1,
    paddingTop: 16,
  },
  listContainer: {
    paddingBottom: 100,
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

  // Header Row with Title and Create Button
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

  // Error Banner Styles
  errorBanner: {
    backgroundColor: "#ffeaea",
    borderBottomWidth: 1,
    borderBottomColor: "#e74c3c",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#c0392b",
    flex: 1,
  },

  // Create Post Button
  createPostButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4abd3e",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  createPostText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 14,
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    fontWeight: "500",
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },

  // Login Container
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 32,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginTop: 16,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    lineHeight: 24,
  },
});

export default Community;
