import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { Post } from "@/services/postsService";
import { useAuth } from "@/context/authcontext";

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onShare?: (postId: string) => void;
  showDeleteButton?: boolean;
  compact?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onDelete,
  onShare,
  showDeleteButton = false,
  compact = false,
}) => {
  const { session } = useAuth();

  // Generate user initials
  const getUserInitials = (userName: string | undefined) => {
    if (!userName) return "U";
    return userName
      .split(" ")
      .map((name) => name.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  };

  // Format time ago
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor(
      (now.getTime() - postDate.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`;
    return postDate.toLocaleDateString();
  };

  const handleDelete = () => {
    if (!onDelete) return;

    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(post.id),
      },
    ]);
  };

  const UserAvatar = ({
    initials,
    size = 45,
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
    <View style={[styles.container, compact && styles.compactContainer]}>
      {/* Post Header */}
      <View style={styles.header}>
        <UserAvatar
          initials={getUserInitials(post.user_name)}
          size={compact ? 35 : 45}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.username, compact && styles.compactUsername]}>
            {post.user_name || "User"}
          </Text>
          <View style={styles.postMeta}>
            <Text style={styles.timeAgo}>{getTimeAgo(post.created_at)}</Text>
            <Text style={styles.separator}>•</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{post.category}</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerActions}>
          {showDeleteButton && post.user_id === session?.user?.id && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <MaterialIcons name="delete" size={20} color="#ff6b6b" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.moreButton}>
            <MaterialIcons name="more-horiz" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Post Content */}
      {post.title && (
        <Text style={[styles.title, compact && styles.compactTitle]}>
          {post.title}
        </Text>
      )}

      {post.content && (
        <Text style={[styles.content, compact && styles.compactContent]}>
          {post.content}
        </Text>
      )}

      {/* Post Image */}
      {post.image_url && (
        <Image
          source={{ uri: post.image_url }}
          style={[styles.image, compact && styles.compactImage]}
        />
      )}

      {/* Post Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, post.is_liked && styles.likedButton]}
          onPress={() => onLike(post.id)}
        >
          <FontAwesome
            name={post.is_liked ? "heart" : "heart-o"}
            size={compact ? 16 : 20}
            color={post.is_liked ? "#ff6b6b" : "#666"}
          />
          <Text style={[styles.actionText, post.is_liked && styles.likedText]}>
            {post.like_count || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onComment(post.id)}
        >
          <FontAwesome name="comment-o" size={compact ? 16 : 20} color="#666" />
          <Text style={styles.actionText}>{post.comment_count || 0}</Text>
        </TouchableOpacity>

        {onShare && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onShare(post.id)}
          >
            <FontAwesome name="share" size={compact ? 14 : 18} color="#666" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  compactContainer: {
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarContainer: {
    backgroundColor: "#4abd3e",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarText: {
    color: "white",
    fontWeight: "bold",
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#2c3e50",
    marginBottom: 2,
  },
  compactUsername: {
    fontSize: 14,
  },
  postMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeAgo: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  separator: {
    fontSize: 12,
    color: "#bdc3c7",
    marginHorizontal: 6,
  },
  categoryBadge: {
    backgroundColor: "#e8f5e8",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 10,
    color: "#2a7a2a",
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteButton: {
    padding: 8,
    marginRight: 4,
  },
  moreButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  compactTitle: {
    fontSize: 16,
    marginBottom: 6,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: "#34495e",
    marginBottom: 12,
  },
  compactContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  image: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#f0f0f0",
  },
  compactImage: {
    height: 200,
    marginBottom: 12,
    borderRadius: 8,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
  },
  likedButton: {
    backgroundColor: "#ffebee",
  },
  actionText: {
    marginLeft: 6,
    color: "#666",
    fontSize: 13,
    fontWeight: "600",
  },
  likedText: {
    color: "#ff6b6b",
  },
});

export default PostCard;
