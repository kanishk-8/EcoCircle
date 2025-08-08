import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { postsService, Post, Comment, CreatePostData, CreateCommentData } from '@/services/postsService';
import { useAuth } from './authcontext';

interface PostsState {
  posts: Post[];
  userPosts: Post[];
  currentPost: Post | null;
  comments: Comment[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

interface PostsContextType extends PostsState {
  // Post actions
  createPost: (postData: CreatePostData) => Promise<boolean>;
  updatePost: (postId: string, updates: Partial<CreatePostData>) => Promise<boolean>;
  deletePost: (postId: string) => Promise<boolean>;
  fetchPosts: (refresh?: boolean) => Promise<void>;
  fetchUserPosts: (userId?: string) => Promise<void>;
  fetchPost: (postId: string) => Promise<void>;

  // Like actions
  toggleLike: (postId: string) => Promise<void>;

  // Comment actions
  fetchComments: (postId: string) => Promise<void>;
  addComment: (commentData: CreateCommentData) => Promise<boolean>;
  updateComment: (commentId: string, content: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;

  // Utility actions
  clearError: () => void;
  clearCurrentPost: () => void;
}

type PostsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_POSTS'; payload: Post[] }
  | { type: 'SET_USER_POSTS'; payload: Post[] }
  | { type: 'SET_CURRENT_POST'; payload: Post | null }
  | { type: 'SET_COMMENTS'; payload: Comment[] }
  | { type: 'ADD_POST'; payload: Post }
  | { type: 'UPDATE_POST'; payload: { postId: string; updates: Partial<Post> } }
  | { type: 'DELETE_POST'; payload: string }
  | { type: 'TOGGLE_LIKE'; payload: { postId: string; isLiked: boolean; likeDelta: number } }
  | { type: 'ADD_COMMENT'; payload: Comment }
  | { type: 'UPDATE_COMMENT'; payload: { commentId: string; content: string } }
  | { type: 'DELETE_COMMENT'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_CURRENT_POST' };

const initialState: PostsState = {
  posts: [],
  userPosts: [],
  currentPost: null,
  comments: [],
  loading: false,
  error: null,
  refreshing: false,
};

function postsReducer(state: PostsState, action: PostsAction): PostsState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_REFRESHING':
      return { ...state, refreshing: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false, refreshing: false };

    case 'SET_POSTS':
      return { ...state, posts: action.payload, loading: false, refreshing: false };

    case 'SET_USER_POSTS':
      return { ...state, userPosts: action.payload, loading: false, refreshing: false };

    case 'SET_CURRENT_POST':
      return { ...state, currentPost: action.payload, loading: false };

    case 'SET_COMMENTS':
      return { ...state, comments: action.payload, loading: false };

    case 'ADD_POST':
      return {
        ...state,
        posts: [action.payload, ...state.posts],
        userPosts: [action.payload, ...state.userPosts],
        loading: false,
      };

    case 'UPDATE_POST':
      const updatePosts = (posts: Post[]) =>
        posts.map(post =>
          post.id === action.payload.postId
            ? { ...post, ...action.payload.updates }
            : post
        );

      return {
        ...state,
        posts: updatePosts(state.posts),
        userPosts: updatePosts(state.userPosts),
        currentPost: state.currentPost?.id === action.payload.postId
          ? { ...state.currentPost, ...action.payload.updates }
          : state.currentPost,
        loading: false,
      };

    case 'DELETE_POST':
      return {
        ...state,
        posts: state.posts.filter(post => post.id !== action.payload),
        userPosts: state.userPosts.filter(post => post.id !== action.payload),
        currentPost: state.currentPost?.id === action.payload ? null : state.currentPost,
        loading: false,
      };

    case 'TOGGLE_LIKE':
      const toggleLikePosts = (posts: Post[]) =>
        posts.map(post =>
          post.id === action.payload.postId
            ? {
                ...post,
                is_liked: action.payload.isLiked,
                like_count: (post.like_count || 0) + action.payload.likeDelta,
              }
            : post
        );

      return {
        ...state,
        posts: toggleLikePosts(state.posts),
        userPosts: toggleLikePosts(state.userPosts),
        currentPost: state.currentPost?.id === action.payload.postId
          ? {
              ...state.currentPost,
              is_liked: action.payload.isLiked,
              like_count: (state.currentPost.like_count || 0) + action.payload.likeDelta,
            }
          : state.currentPost,
      };

    case 'ADD_COMMENT':
      const incrementCommentCount = (posts: Post[]) =>
        posts.map(post =>
          post.id === action.payload.post_id
            ? { ...post, comment_count: (post.comment_count || 0) + 1 }
            : post
        );

      return {
        ...state,
        posts: incrementCommentCount(state.posts),
        userPosts: incrementCommentCount(state.userPosts),
        currentPost: state.currentPost?.id === action.payload.post_id
          ? { ...state.currentPost, comment_count: (state.currentPost.comment_count || 0) + 1 }
          : state.currentPost,
        comments: [...state.comments, action.payload],
      };

    case 'UPDATE_COMMENT':
      return {
        ...state,
        comments: state.comments.map(comment =>
          comment.id === action.payload.commentId
            ? { ...comment, content: action.payload.content }
            : comment
        ),
      };

    case 'DELETE_COMMENT':
      const decrementCommentCount = (posts: Post[]) =>
        posts.map(post => {
          const deletedComment = state.comments.find(c => c.id === action.payload);
          return deletedComment && post.id === deletedComment.post_id
            ? { ...post, comment_count: Math.max((post.comment_count || 0) - 1, 0) }
            : post;
        });

      const deletedComment = state.comments.find(c => c.id === action.payload);

      return {
        ...state,
        posts: decrementCommentCount(state.posts),
        userPosts: decrementCommentCount(state.userPosts),
        currentPost: deletedComment && state.currentPost?.id === deletedComment.post_id
          ? { ...state.currentPost, comment_count: Math.max((state.currentPost.comment_count || 0) - 1, 0) }
          : state.currentPost,
        comments: state.comments.filter(comment => comment.id !== action.payload),
      };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'CLEAR_CURRENT_POST':
      return { ...state, currentPost: null, comments: [] };

    default:
      return state;
  }
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

export const PostsProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(postsReducer, initialState);
  const { isUser } = useAuth();

  // Post actions
  const createPost = useCallback(async (postData: CreatePostData): Promise<boolean> => {
    if (!isUser) {
      dispatch({ type: 'SET_ERROR', payload: 'You must be logged in to create a post' });
      return false;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const { data, error } = await postsService.createPost(postData);

      if (error || !data) {
        dispatch({ type: 'SET_ERROR', payload: error?.message || 'Failed to create post' });
        return false;
      }

      dispatch({ type: 'ADD_POST', payload: data });
      return true;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    }
  }, [isUser]);

  const updatePost = useCallback(async (postId: string, updates: Partial<CreatePostData>): Promise<boolean> => {
    if (!isUser) {
      dispatch({ type: 'SET_ERROR', payload: 'You must be logged in to update posts' });
      return false;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const { data, error } = await postsService.updatePost(postId, updates);

      if (error || !data) {
        dispatch({ type: 'SET_ERROR', payload: error?.message || 'Failed to update post' });
        return false;
      }

      dispatch({ type: 'UPDATE_POST', payload: { postId, updates: data } });
      return true;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    }
  }, [isUser]);

  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!isUser) {
      dispatch({ type: 'SET_ERROR', payload: 'You must be logged in to delete posts' });
      return false;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const { error } = await postsService.deletePost(postId);

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error?.message || 'Failed to delete post' });
        return false;
      }

      dispatch({ type: 'DELETE_POST', payload: postId });
      return true;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    }
  }, [isUser]);

  const fetchPosts = useCallback(async (refresh: boolean = false): Promise<void> => {
    if (!isUser) return;

    if (refresh) {
      dispatch({ type: 'SET_REFRESHING', payload: true });
    } else {
      dispatch({ type: 'SET_LOADING', payload: true });
    }
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const { data, error } = await postsService.getPosts();

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error?.message || 'Failed to fetch posts' });
        return;
      }

      dispatch({ type: 'SET_POSTS', payload: data || [] });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
    }
  }, [isUser]);

  const fetchUserPosts = useCallback(async (userId?: string): Promise<void> => {
    if (!isUser) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const { data, error } = await postsService.getUserPosts(userId);

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error?.message || 'Failed to fetch user posts' });
        return;
      }

      dispatch({ type: 'SET_USER_POSTS', payload: data || [] });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
    }
  }, [isUser]);

  const fetchPost = useCallback(async (postId: string): Promise<void> => {
    if (!isUser) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const { data, error } = await postsService.getPost(postId);

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error?.message || 'Failed to fetch post' });
        return;
      }

      dispatch({ type: 'SET_CURRENT_POST', payload: data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
    }
  }, [isUser]);

  // Like actions
  const toggleLike = useCallback(async (postId: string): Promise<void> => {
    if (!isUser) {
      dispatch({ type: 'SET_ERROR', payload: 'You must be logged in to like posts' });
      return;
    }

    try {
      const { isLiked, error } = await postsService.toggleLike(postId);

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error?.message || 'Failed to toggle like' });
        return;
      }

      const likeDelta = isLiked ? 1 : -1;
      dispatch({ type: 'TOGGLE_LIKE', payload: { postId, isLiked, likeDelta } });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
    }
  }, [isUser]);

  // Comment actions
  const fetchComments = useCallback(async (postId: string): Promise<void> => {
    if (!isUser) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const { data, error } = await postsService.getPostComments(postId);

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error?.message || 'Failed to fetch comments' });
        return;
      }

      dispatch({ type: 'SET_COMMENTS', payload: data || [] });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
    }
  }, [isUser]);

  const addComment = useCallback(async (commentData: CreateCommentData): Promise<boolean> => {
    if (!isUser) {
      dispatch({ type: 'SET_ERROR', payload: 'You must be logged in to comment' });
      return false;
    }

    try {
      const { data, error } = await postsService.addComment(commentData);

      if (error || !data) {
        dispatch({ type: 'SET_ERROR', payload: error?.message || 'Failed to add comment' });
        return false;
      }

      dispatch({ type: 'ADD_COMMENT', payload: data });
      return true;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    }
  }, [isUser]);

  const updateComment = useCallback(async (commentId: string, content: string): Promise<boolean> => {
    if (!isUser) {
      dispatch({ type: 'SET_ERROR', payload: 'You must be logged in to update comments' });
      return false;
    }

    try {
      const { data, error } = await postsService.updateComment(commentId, content);

      if (error || !data) {
        dispatch({ type: 'SET_ERROR', payload: error?.message || 'Failed to update comment' });
        return false;
      }

      dispatch({ type: 'UPDATE_COMMENT', payload: { commentId, content } });
      return true;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    }
  }, [isUser]);

  const deleteComment = useCallback(async (commentId: string): Promise<boolean> => {
    if (!isUser) {
      dispatch({ type: 'SET_ERROR', payload: 'You must be logged in to delete comments' });
      return false;
    }

    try {
      const { error } = await postsService.deleteComment(commentId);

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error?.message || 'Failed to delete comment' });
        return false;
      }

      dispatch({ type: 'DELETE_COMMENT', payload: commentId });
      return true;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    }
  }, [isUser]);

  // Utility actions
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const clearCurrentPost = useCallback(() => {
    dispatch({ type: 'CLEAR_CURRENT_POST' });
  }, []);

  const value: PostsContextType = {
    ...state,
    createPost,
    updatePost,
    deletePost,
    fetchPosts,
    fetchUserPosts,
    fetchPost,
    toggleLike,
    fetchComments,
    addComment,
    updateComment,
    deleteComment,
    clearError,
    clearCurrentPost,
  };

  return (
    <PostsContext.Provider value={value}>
      {children}
    </PostsContext.Provider>
  );
};

export const usePosts = () => {
  const context = useContext(PostsContext);
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostsProvider');
  }
  return context;
};

export default PostsContext;
