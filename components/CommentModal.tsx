import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { usePosts } from "@/context/postsContext";
import { useAuth } from "@/context/authcontext";

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postTitle?: string;
}

const CommentModal: React.FC<CommentModalProps> = ({
  visible,
  onClose,
  postId,
  postTitle,
}) => {
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const {
    comments,
    fetchComments,
    addComment,
    deleteComment,
    loading: commentsLoading,
  } = usePosts();
  const { session } = useAuth();

  // Fetch comments when modal opens
  useEffect(() => {
    if (visible && postId) {
      fetchComments(postId);
    }
  }, [visible, postId, fetchComments]);

  // Generate user initials
  const getUserInitials = (userName: string | undefined) => {
    if (!userName) return "U";
    return userName
      .split(" ")
      .map((name) => name.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  };

  // Get current user name
  const getCurrentUserName = () => {
    return (
      session?.user?.user_metadata?.full_name ||
      session?.user?.email?.split("@")[0] ||
      "You"
    );
  };

  // Format time ago
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInMinutes = Math.floor(
      (now.getTime() - commentDate.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    setLoading(true);
    try {
      const success = await addComment({
        post_id: postId,
        content: commentText.trim(),
      });

      if (success) {
        setCommentText("");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete comment
  const handleDeleteComment = (commentId: string) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteComment(commentId),
        },
      ],
    );
  };

  // User Avatar Component
  const UserAvatar = ({
    initials,
    size = 35,
  }: {
    initials: string;
    size?: number;
  }) => (
    <View
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>
        {initials}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Comments</Text>
            {postTitle && (
              <Text style={styles.postTitle} numberOfLines={1}>
                {postTitle}
              </Text>
            )}
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Comments List */}
        <ScrollView
          style={styles.commentsContainer}
          showsVerticalScrollIndicator={false}
        >
          {commentsLoading ? (
            <View style={styles.loadingContainer}>
              <MaterialIcons name="hourglass-empty" size={40} color="#4abd3e" />
              <Text style={styles.loadingText}>Loading comments...</Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="comment" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>
                Be the first to share your thoughts!
              </Text>
            </View>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <UserAvatar initials={getUserInitials(comment.user_name)} />

                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUserName}>
                      {comment.user_name || "Unknown User"}
                    </Text>
                    <Text style={styles.commentTime}>
                      {getTimeAgo(comment.created_at)}
                    </Text>
                    {comment.user_id === session?.user?.id && (
                      <TouchableOpacity
                        onPress={() => handleDeleteComment(comment.id)}
                        style={styles.deleteCommentButton}
                      >
                        <MaterialIcons
                          name="delete"
                          size={16}
                          color="#ff6b6b"
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.commentText}>{comment.content}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Add Comment Section */}
        <View style={styles.addCommentContainer}>
          <UserAvatar initials={getUserInitials(getCurrentUserName())} />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor="#999"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <Text style={styles.characterCount}>{commentText.length}/500</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!commentText.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={handleAddComment}
            disabled={!commentText.trim() || loading}
          >
            <MaterialIcons
              name="send"
              size={20}
              color={!commentText.trim() || loading ? "#ccc" : "#4abd3e"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    backgroundColor: "#fff",
  },
  closeButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  postTitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  commentsContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
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
  commentItem: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  avatarContainer: {
    backgroundColor: "#4abd3e",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  avatarText: {
    color: "white",
    fontWeight: "bold",
  },
  commentContent: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 12,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    flex: 1,
  },
  commentTime: {
    fontSize: 12,
    color: "#666",
    marginRight: 8,
  },
  deleteCommentButton: {
    padding: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#34495e",
  },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    backgroundColor: "#fff",
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: "#f8f9fa",
    maxHeight: 100,
  },
  characterCount: {
    fontSize: 10,
    color: "#999",
    textAlign: "right",
    marginTop: 4,
    marginRight: 8,
  },
  sendButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: "#f0f8f0",
  },
  sendButtonDisabled: {
    backgroundColor: "#f5f5f5",
  },
});

export default CommentModal;
