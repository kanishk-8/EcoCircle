# EcoCircle Posts Service Setup

This document provides instructions for setting up the posts service in your EcoCircle app with Supabase.

## Prerequisites

- Supabase project set up
- EcoCircle app with authentication working
- Supabase client configured in `utils/supabase.ts`

## Database Setup

### 1. Run the SQL Schema

Execute the SQL script in `schema/posts.sql` in your Supabase SQL editor or via the CLI:

```bash
# If using Supabase CLI
supabase db reset

# Or copy and paste the contents of posts.sql into the Supabase SQL editor
```

### 2. Verify Tables Created

The script will create the following tables:
- `posts` - Main posts table
- `comments` - Comments on posts
- `likes` - Post likes/hearts
- `storage.buckets` - Storage bucket for post images

### 3. Verify Views Created

The script also creates helpful views:
- `posts_with_stats` - Posts with like/comment counts and user info
- `comments_with_user` - Comments with user information

## Storage Setup

### 1. Verify Storage Bucket

The SQL script automatically creates a `posts` bucket in Supabase Storage. Verify it exists in your Supabase dashboard under Storage.

### 2. Storage Policies

The following RLS policies are automatically created:
- Users can upload images to their own folder (`user_id/filename.ext`)
- Public read access to all post images
- Users can only update/delete their own images

## Environment Variables

Ensure your `.env` or Expo environment has:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Dependencies

Install required packages:

```bash
npm install expo-image-picker expo-file-system
```

## Usage

### 1. Wrap Your App with PostsProvider

The `PostsProvider` is already added to `app/_layout.tsx`. This provides posts context throughout the app.

### 2. Using the Posts Service

```tsx
import { usePosts } from '@/context/postsContext';

function MyComponent() {
  const {
    posts,
    loading,
    createPost,
    fetchPosts,
    toggleLike,
    addComment,
    deletePost
  } = usePosts();

  // Use the methods...
}
```

### 3. Creating Posts

```tsx
const handleCreatePost = async () => {
  const success = await createPost({
    title: "My eco-friendly action",
    content: "Just planted 10 trees!",
    category: "Tree Planting",
    image: selectedImage // From expo-image-picker
  });

  if (success) {
    console.log("Post created successfully!");
  }
};
```

### 4. Managing Likes

```tsx
const handleLike = async (postId: string) => {
  await toggleLike(postId);
  // Like status will be automatically updated in the UI
};
```

### 5. Adding Comments

```tsx
const handleComment = async (postId: string) => {
  const success = await addComment({
    post_id: postId,
    content: "Great post!"
  });
};
```

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

**Posts:**
- Anyone can view all posts
- Users can only create, update, delete their own posts

**Comments:**
- Anyone can view all comments
- Users can comment on any post
- Users can only update/delete their own comments

**Likes:**
- Anyone can view likes
- Users can only create/delete their own likes

**Storage:**
- Users upload to their own folder: `posts/user_id/filename`
- Public read access to all images
- Users can only modify their own images

### Data Validation

- Posts must have either content or an image (or both)
- Comments cannot be empty
- Only authenticated users can perform actions
- File uploads are restricted to images

## Troubleshooting

### Common Issues

1. **"User not authenticated" errors**
   - Ensure user is logged in before accessing posts features
   - Check that `isUser` is true in auth context

2. **Image upload fails**
   - Verify storage bucket exists and is public
   - Check RLS policies allow user uploads
   - Ensure user has camera roll permissions

3. **Posts not loading**
   - Check database connection
   - Verify RLS policies are correctly set
   - Check network connectivity

4. **Permission denied errors**
   - Verify RLS policies match user authentication
   - Check that user IDs match in database

### Debug Steps

1. Check Supabase logs in the dashboard
2. Verify user authentication status
3. Test database queries in Supabase SQL editor
4. Check storage bucket permissions
5. Validate environment variables

## Features

### ✅ Implemented
- Create posts with text and/or images
- Like/unlike posts
- Comment on posts
- Delete own posts and comments
- Real-time like/comment counts
- User profile with posts tab
- Image upload to Supabase Storage
- Row Level Security
- Post categories
- Responsive UI components

### 🚧 Future Enhancements
- Real-time updates with Supabase subscriptions
- Post editing
- Comment replies
- Post sharing
- Search and filtering
- Image compression
- Video support
- Push notifications

## API Reference

See `services/postsService.ts` for detailed API documentation and type definitions.

## Support

For issues related to:
- **Database**: Check Supabase dashboard logs
- **Authentication**: Verify auth context setup
- **Storage**: Check bucket policies and permissions
- **UI**: Test with React Native debugger
