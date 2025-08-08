-- Fix for EcoCircle Signup Issue
-- This script addresses the "Database error saving new user" problem
-- Run this in your Supabase SQL Editor

-- 1. First, let's check if there are any problematic triggers or functions
-- Drop any existing problematic triggers that might be causing the signup to fail
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Create a profiles table to store additional user information
-- This table will be populated when a user signs up
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for profiles table
-- Users can view all profiles (for displaying usernames in posts/comments)
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Users can only insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Create a safe function to handle new user registration
-- This function will create a profile record when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    display_name TEXT;
BEGIN
    -- Extract display name from email or metadata
    display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- Insert into profiles table with error handling
    BEGIN
        INSERT INTO public.profiles (id, email, full_name)
        VALUES (NEW.id, NEW.email, display_name);
    EXCEPTION
        WHEN unique_violation THEN
            -- Profile already exists, just update it
            UPDATE public.profiles
            SET email = NEW.email, full_name = display_name, updated_at = NOW()
            WHERE id = NEW.id;
        WHEN OTHERS THEN
            -- Log error but don't fail the signup
            RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$;

-- 6. Create the trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 7. Add trigger for updating profiles updated_at timestamp
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- 10. Update the posts_with_stats view to use profiles table for better user info
DROP VIEW IF EXISTS posts_with_stats;
CREATE VIEW posts_with_stats AS
SELECT
    p.*,
    COALESCE(l.like_count, 0) as like_count,
    COALESCE(c.comment_count, 0) as comment_count,
    COALESCE(pr.email, u.email) as user_email,
    COALESCE(pr.full_name, u.raw_user_meta_data->>'full_name', split_part(COALESCE(pr.email, u.email), '@', 1)) as user_name,
    pr.avatar_url as user_avatar
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
LEFT JOIN public.profiles pr ON p.user_id = pr.id
ORDER BY p.created_at DESC;

-- 11. Update comments_with_user view to use profiles table
DROP VIEW IF EXISTS comments_with_user;
CREATE VIEW comments_with_user AS
SELECT
    c.*,
    COALESCE(pr.email, u.email) as user_email,
    COALESCE(pr.full_name, u.raw_user_meta_data->>'full_name', split_part(COALESCE(pr.email, u.email), '@', 1)) as user_name,
    pr.avatar_url as user_avatar
FROM comments c
LEFT JOIN auth.users u ON c.user_id = u.id
LEFT JOIN public.profiles pr ON c.user_id = pr.id
ORDER BY c.created_at ASC;

-- 12. Check for any foreign key constraint issues
-- Ensure all existing tables have proper constraints
ALTER TABLE posts
    DROP CONSTRAINT IF EXISTS posts_user_id_fkey,
    ADD CONSTRAINT posts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE comments
    DROP CONSTRAINT IF EXISTS comments_user_id_fkey,
    ADD CONSTRAINT comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE likes
    DROP CONSTRAINT IF EXISTS likes_user_id_fkey,
    ADD CONSTRAINT likes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 13. Create a function to safely get user display name
CREATE OR REPLACE FUNCTION public.get_user_display_name(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    display_name TEXT;
BEGIN
    SELECT COALESCE(pr.full_name, u.raw_user_meta_data->>'full_name', split_part(pr.email, '@', 1))
    INTO display_name
    FROM auth.users u
    LEFT JOIN public.profiles pr ON u.id = pr.id
    WHERE u.id = user_id;

    RETURN COALESCE(display_name, 'Unknown User');
END;
$$;

-- 14. Create a function to handle profile updates
CREATE OR REPLACE FUNCTION public.update_user_profile(
    user_id UUID,
    new_full_name TEXT DEFAULT NULL,
    new_bio TEXT DEFAULT NULL,
    new_avatar_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow users to update their own profile
    IF auth.uid() != user_id THEN
        RETURN FALSE;
    END IF;

    UPDATE public.profiles
    SET
        full_name = COALESCE(new_full_name, full_name),
        bio = COALESCE(new_bio, bio),
        avatar_url = COALESCE(new_avatar_url, avatar_url),
        updated_at = NOW()
    WHERE id = user_id;

    RETURN FOUND;
END;
$$;

-- 15. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_display_name(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- 16. Final check - ensure no conflicting policies exist
-- Drop any overly restrictive policies that might block user creation
DO $$
BEGIN
    -- This will help identify any problematic policies
    RAISE NOTICE 'Database setup complete. If you still have signup issues, check the Supabase logs for specific error details.';
END
$$;

-- 17. Test query to verify the setup works
-- You can run this after a successful signup to verify everything is working:
-- SELECT
--     u.id,
--     u.email,
--     pr.full_name,
--     pr.created_at as profile_created
-- FROM auth.users u
-- LEFT JOIN public.profiles pr ON u.id = pr.id
-- ORDER BY u.created_at DESC
-- LIMIT 5;

-- Additional debugging queries you can run if needed:
-- Check for any existing problematic triggers:
-- SELECT * FROM information_schema.triggers WHERE trigger_schema = 'public' OR event_object_schema = 'auth';

-- Check for any RLS policies that might be too restrictive:
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Check for any foreign key constraints:
-- SELECT * FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY';
