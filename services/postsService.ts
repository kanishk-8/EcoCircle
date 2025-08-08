import { supabase } from "@/utils/supabase";
import * as ImagePicker from "expo-image-picker";
import { imageUploadService } from "./imageUploadService";

export interface Post {
  id: string;
  user_id: string;
  title?: string;
  content?: string;
  image_url?: string;
  category: string;
  created_at: string;
  updated_at: string;
  like_count?: number;
  comment_count?: number;
  user_email?: string;
  user_name?: string;
  is_liked?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

export interface CreatePostData {
  title?: string;
  content?: string;
  category?: string;
  image?: ImagePicker.ImagePickerAsset;
}

export interface CreateCommentData {
  post_id: string;
  content: string;
}

class PostsService {
  // Upload image to Supabase Storage using the new service
  private async uploadPostImage(
    image: ImagePicker.ImagePickerAsset,
    userId: string,
  ): Promise<string | null> {
    try {
      const imageAsset = {
        uri: image.uri,
        width: image.width,
        height: image.height,
        fileSize: image.fileSize,
        type: image.type,
      };

      const result = await imageUploadService.uploadImage(imageAsset, userId);

      if (result.success && result.url) {
        return result.url;
      } else {
        console.error("Image upload failed:", result.error);
        return null;
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  }

  // Create a new post
  async createPost(
    postData: CreatePostData,
  ): Promise<{ data: Post | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: "User not authenticated" };
      }

      let imageUrl: string | null = null;

      // Upload image if provided
      if (postData.image) {
        imageUrl = await this.uploadPostImage(postData.image, user.id);
      }

      // Validate that either content or image is provided
      if (!postData.content && !imageUrl) {
        return {
          data: null,
          error: "Post must have either content or an image",
        };
      }

      const { data: insertData, error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          title: postData.title || null,
          content: postData.content || null,
          image_url: imageUrl,
          category: postData.category || "General",
        })
        .select("id")
        .single();

      if (insertError || !insertData) {
        console.error("Error creating post:", insertError);
        return { data: null, error: insertError };
      }

      // Fetch the complete post with user info from the view
      const { data, error } = await supabase
        .from("posts_with_stats")
        .select("*")
        .eq("id", insertData.id)
        .single();

      if (error) {
        console.error("Error fetching created post:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error creating post:", error);
      return { data: null, error };
    }
  }

  // Get all posts with stats
  async getPosts(
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ data: Post[] | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: "User not authenticated" };
      }

      const { data: posts, error } = await supabase
        .from("posts_with_stats")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error fetching posts:", error);
        return { data: null, error };
      }

      // Check if user has liked each post
      const postsWithLikes = await Promise.all(
        posts.map(async (post) => {
          const { data: likeData } = await supabase
            .from("likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", user.id)
            .single();

          return {
            ...post,
            is_liked: !!likeData,
          };
        }),
      );

      return { data: postsWithLikes, error: null };
    } catch (error) {
      console.error("Error fetching posts:", error);
      return { data: null, error };
    }
  }

  // Get posts by user
  async getUserPosts(
    userId?: string,
  ): Promise<{ data: Post[] | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: "User not authenticated" };
      }

      const targetUserId = userId || user.id;

      const { data: posts, error } = await supabase
        .from("posts_with_stats")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user posts:", error);
        return { data: null, error };
      }

      // Check if user has liked each post
      const postsWithLikes = await Promise.all(
        posts.map(async (post) => {
          const { data: likeData } = await supabase
            .from("likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", user.id)
            .single();

          return {
            ...post,
            is_liked: !!likeData,
          };
        }),
      );

      return { data: postsWithLikes, error: null };
    } catch (error) {
      console.error("Error fetching user posts:", error);
      return { data: null, error };
    }
  }

  // Get a single post
  async getPost(postId: string): Promise<{ data: Post | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: "User not authenticated" };
      }

      const { data: post, error } = await supabase
        .from("posts_with_stats")
        .select("*")
        .eq("id", postId)
        .single();

      if (error) {
        console.error("Error fetching post:", error);
        return { data: null, error };
      }

      // Check if user has liked the post
      const { data: likeData } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", user.id)
        .single();

      const postWithLike = {
        ...post,
        is_liked: !!likeData,
      };

      return { data: postWithLike, error: null };
    } catch (error) {
      console.error("Error fetching post:", error);
      return { data: null, error };
    }
  }

  // Update a post
  async updatePost(
    postId: string,
    updates: Partial<CreatePostData>,
  ): Promise<{ data: Post | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: "User not authenticated" };
      }

      let imageUrl: string | undefined;

      // Upload new image if provided
      if (updates.image) {
        const uploadedUrl = await this.uploadPostImage(updates.image, user.id);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.category !== undefined)
        updateData.category = updates.category;
      if (imageUrl) updateData.image_url = imageUrl;

      const { data, error } = await supabase
        .from("posts")
        .update(updateData)
        .eq("id", postId)
        .eq("user_id", user.id) // Ensure user can only update their own posts
        .select("*")
        .single();

      if (error) {
        console.error("Error updating post:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error updating post:", error);
      return { data: null, error };
    }
  }

  // Delete a post
  async deletePost(postId: string): Promise<{ error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { error: "User not authenticated" };
      }

      // First get the post to check ownership and get image URL
      const { data: post, error: fetchError } = await supabase
        .from("posts")
        .select("image_url, user_id")
        .eq("id", postId)
        .single();

      if (fetchError || !post) {
        return { error: "Post not found" };
      }

      if (post.user_id !== user.id) {
        return { error: "You can only delete your own posts" };
      }

      // Delete the image from storage if it exists
      if (post.image_url) {
        const imagePath = post.image_url.split("/").slice(-2).join("/"); // Get user_id/filename
        await supabase.storage.from("posts").remove([imagePath]);
      }

      // Delete the post (this will cascade delete likes and comments)
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting post:", error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error("Error deleting post:", error);
      return { error };
    }
  }

  // Like/Unlike a post
  async toggleLike(postId: string): Promise<{ isLiked: boolean; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { isLiked: false, error: "User not authenticated" };
      }

      // Check if already liked
      const { data: existingLike, error: checkError } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error checking like status:", checkError);
        return { isLiked: false, error: checkError };
      }

      if (existingLike) {
        // Unlike the post
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("id", existingLike.id);

        if (error) {
          console.error("Error removing like:", error);
          return { isLiked: true, error };
        }

        return { isLiked: false, error: null };
      } else {
        // Like the post
        const { error } = await supabase.from("likes").insert({
          post_id: postId,
          user_id: user.id,
        });

        if (error) {
          console.error("Error adding like:", error);
          return { isLiked: false, error };
        }

        return { isLiked: true, error: null };
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      return { isLiked: false, error };
    }
  }

  // Get comments for a post
  async getPostComments(
    postId: string,
  ): Promise<{ data: Comment[] | null; error: any }> {
    try {
      const { data: comments, error } = await supabase
        .from("comments_with_user")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comments:", error);
        return { data: null, error };
      }

      return { data: comments, error: null };
    } catch (error) {
      console.error("Error fetching comments:", error);
      return { data: null, error };
    }
  }

  // Add a comment to a post
  async addComment(
    commentData: CreateCommentData,
  ): Promise<{ data: Comment | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: "User not authenticated" };
      }

      if (!commentData.content.trim()) {
        return { data: null, error: "Comment content cannot be empty" };
      }

      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: commentData.post_id,
          user_id: user.id,
          content: commentData.content.trim(),
        })
        .select("*")
        .single();

      if (error) {
        console.error("Error adding comment:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error adding comment:", error);
      return { data: null, error };
    }
  }

  // Update a comment
  async updateComment(
    commentId: string,
    content: string,
  ): Promise<{ data: Comment | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: "User not authenticated" };
      }

      if (!content.trim()) {
        return { data: null, error: "Comment content cannot be empty" };
      }

      const { data, error } = await supabase
        .from("comments")
        .update({ content: content.trim() })
        .eq("id", commentId)
        .eq("user_id", user.id) // Ensure user can only update their own comments
        .select("*")
        .single();

      if (error) {
        console.error("Error updating comment:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error updating comment:", error);
      return { data: null, error };
    }
  }

  // Delete a comment
  async deleteComment(commentId: string): Promise<{ error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { error: "User not authenticated" };
      }

      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id); // Ensure user can only delete their own comments

      if (error) {
        console.error("Error deleting comment:", error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error("Error deleting comment:", error);
      return { error };
    }
  }
  // Test storage connectivity using the image upload service
  async testStorageConnection(): Promise<{ success: boolean; error?: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      const result = await imageUploadService.testStorageConnection(user.id);
      return result;
    } catch (error) {
      console.error("Storage test error:", error);
      return { success: false, error };
    }
  }
}

export const postsService = new PostsService();
