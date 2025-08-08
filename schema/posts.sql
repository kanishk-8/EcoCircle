-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Posts table
CREATE TABLE posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    content TEXT,
    image_url TEXT,
    category TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table
CREATE TABLE comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes table
CREATE TABLE likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Add indexes for better performance
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);

-- Create storage bucket for post images (handle if already exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO UPDATE SET
  name = 'posts',
  public = true;

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts table
-- Users can view all posts
CREATE POLICY "Posts are viewable by everyone"
ON posts FOR SELECT
TO authenticated
USING (true);

-- Users can only insert their own posts
CREATE POLICY "Users can insert their own posts"
ON posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own posts
CREATE POLICY "Users can update their own posts"
ON posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own posts
CREATE POLICY "Users can delete their own posts"
ON posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for comments table
-- Users can view all comments
CREATE POLICY "Comments are viewable by everyone"
ON comments FOR SELECT
TO authenticated
USING (true);

-- Users can insert comments on any post
CREATE POLICY "Users can insert comments"
ON comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own comments
CREATE POLICY "Users can update their own comments"
ON comments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own comments
CREATE POLICY "Users can delete their own comments"
ON comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for likes table
-- Users can view all likes
CREATE POLICY "Likes are viewable by everyone"
ON likes FOR SELECT
TO authenticated
USING (true);

-- Users can only insert their own likes
CREATE POLICY "Users can insert their own likes"
ON likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own likes
CREATE POLICY "Users can delete their own likes"
ON likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Storage policies for posts bucket
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Allow authenticated uploads to posts bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'posts' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view all post images
CREATE POLICY "Allow public access to post images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'posts');

-- Allow users to update their own images
CREATE POLICY "Allow users to update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'posts' AND
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'posts' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own images
CREATE POLICY "Allow users to delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'posts' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for easier data fetching
CREATE VIEW posts_with_stats AS
SELECT
    p.*,
    COALESCE(l.like_count, 0) as like_count,
    COALESCE(c.comment_count, 0) as comment_count,
    u.email as user_email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as user_name
FROM posts p
LEFT JOIN (
    SELECT post_id, COUNT(*) as like_count
    FROM likes
    GROUP BY post_id
) l ON p.id = l.post_id
LEFT JOIN (
    SELECT post_id, COUNT(*) as comment_count
    FROM comments
    GROUP BY post_id
) c ON p.id = c.post_id
LEFT JOIN auth.users u ON p.user_id = u.id
ORDER BY p.created_at DESC;

CREATE VIEW comments_with_user AS
SELECT
    c.*,
    u.email as user_email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as user_name
FROM comments c
LEFT JOIN auth.users u ON c.user_id = u.id
ORDER BY c.created_at ASC;
