import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { supabase } from "@/utils/supabase";

// Use MediaTypeOptions for now (despite deprecation warning)

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ImageAsset {
  uri: string;
  width?: number;
  height?: number;
  fileSize?: number;
  type?: string;
}

class ImageUploadService {
  // Check and request permissions
  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        const { status: newStatus } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        return newStatus === "granted";
      }

      return true;
    } catch (error) {
      console.error("Permission check failed:", error);
      return false;
    }
  }

  // Pick image from gallery
  async pickImage(): Promise<ImageAsset | null> {
    try {
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        throw new Error("Media library permission denied");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      return result.assets[0];
    } catch (error) {
      console.error("Image picking failed:", error);
      throw error;
    }
  }

  // Take photo with camera
  async takePhoto(): Promise<ImageAsset | null> {
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();

      if (status !== "granted") {
        const { status: newStatus } =
          await ImagePicker.requestCameraPermissionsAsync();
        if (newStatus !== "granted") {
          throw new Error("Camera permission denied");
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      return result.assets[0];
    } catch (error) {
      console.error("Camera capture failed:", error);
      throw error;
    }
  }

  // Simple test method without MediaType enum
  async testPickImageSimple(): Promise<ImageAsset | null> {
    try {
      console.log("Testing simple image picker...");

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      console.log("Simple picker result:", result);

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      return result.assets[0];
    } catch (error) {
      console.error("Simple image picker failed:", error);
      throw error;
    }
  }

  // Validate image
  private validateImage(image: ImageAsset): void {
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (image.fileSize && image.fileSize > maxSize) {
      throw new Error("Image size must be less than 5MB");
    }

    if (!image.uri) {
      throw new Error("Invalid image URI");
    }
  }

  // Upload image to Supabase Storage
  async uploadImage(
    image: ImageAsset,
    userId: string,
  ): Promise<ImageUploadResult> {
    try {
      console.log("Starting image upload...");

      // Validate image
      this.validateImage(image);

      // Generate unique filename
      const fileExtension = image.uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const filePath = `${userId}/${fileName}`;

      console.log("Upload path:", filePath);
      console.log("File extension:", fileExtension);

      // Check if file exists locally
      const fileInfo = await FileSystem.getInfoAsync(image.uri);
      if (!fileInfo.exists) {
        throw new Error("Image file not found");
      }

      console.log("File info:", fileInfo);

      // Try Method 1: FormData upload (better for React Native)
      try {
        console.log("Trying FormData upload...");
        const formData = new FormData();
        formData.append("file", {
          uri: image.uri,
          type: `image/${fileExtension}`,
          name: fileName,
        } as any);

        // Get auth session for upload
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          throw new Error("No authentication session");
        }

        // Upload using direct fetch to Supabase Storage API
        const uploadUrl = `${supabase.supabaseUrl}/storage/v1/object/posts/${filePath}`;
        console.log("Uploading to:", uploadUrl);

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(
            `FormData upload failed: ${uploadResponse.status} - ${errorText}`,
          );
        }

        const uploadResult = await uploadResponse.json();
        console.log("FormData upload successful:", uploadResult);

        // Get public URL using the file path
        const { data: urlData } = supabase.storage
          .from("posts")
          .getPublicUrl(filePath);

        console.log("Public URL:", urlData.publicUrl);

        return {
          success: true,
          url: urlData.publicUrl,
        };
      } catch (formDataError) {
        console.log("FormData upload failed, trying blob method...");
        console.error("FormData error:", formDataError);

        // Method 2: Fallback to blob upload
        const response = await fetch(image.uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const blob = await response.blob();
        console.log("Blob size:", blob.size, "bytes");
        console.log("Blob type:", blob.type);

        // Upload to Supabase Storage using the client
        console.log("Uploading blob to Supabase...");
        const { data, error } = await supabase.storage
          .from("posts")
          .upload(filePath, blob, {
            contentType: `image/${fileExtension}`,
            upsert: false,
          });

        if (error) {
          console.error("Blob upload error:", error);
          throw new Error(`Blob upload failed: ${error.message}`);
        }

        console.log("Blob upload successful:", data);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("posts")
          .getPublicUrl(data.path);

        console.log("Public URL:", urlData.publicUrl);

        return {
          success: true,
          url: urlData.publicUrl,
        };
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Alternative upload method using base64 (fallback)
  async uploadImageBase64(
    image: ImageAsset,
    userId: string,
  ): Promise<ImageUploadResult> {
    try {
      console.log("Starting base64 upload...");

      this.validateImage(image);

      const fileExtension = image.uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const filePath = `${userId}/${fileName}`;

      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(image.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob
      const blob = new Blob([bytes], { type: `image/${fileExtension}` });

      const { data, error } = await supabase.storage
        .from("posts")
        .upload(filePath, blob, {
          contentType: `image/${fileExtension}`,
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("posts")
        .getPublicUrl(data.path);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error("Base64 upload failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Test storage connection
  async testStorageConnection(
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("Testing storage connection...");

      // Try to list files in user's folder
      const { data, error } = await supabase.storage
        .from("posts")
        .list(userId, {
          limit: 1,
        });

      if (error) {
        console.error("Storage test failed:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      console.log("Storage test successful");
      return { success: true };
    } catch (error) {
      console.error("Storage connection test failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Show image picker options
  async showImagePickerOptions(): Promise<ImageAsset | null> {
    return new Promise((resolve) => {
      // This would typically show an ActionSheet or Alert
      // For now, we'll just use the gallery picker
      this.pickImage()
        .then(resolve)
        .catch(() => resolve(null));
    });
  }
}

export const imageUploadService = new ImageUploadService();
