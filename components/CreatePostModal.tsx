import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import BottomSheet, {
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetHandle,
} from "@gorhom/bottom-sheet";
import { MaterialIcons } from "@expo/vector-icons";
import { CreatePostData, postsService } from "@/services/postsService";
import { imageUploadService, ImageAsset } from "@/services/imageUploadService";
import { geminiValidationService } from "@/services/geminiValidationService";

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (postData: CreatePostData) => Promise<boolean>;
  loading?: boolean;
}

const categories = [
  "General",
  "Tree Planting",
  "Sustainability",
  "Transport",
  "Cleanup",
  "Green Living",
  "Climate Action",
  "Zero Waste",
  "Energy",
  "Water Conservation",
];

const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = ["50%", "90%"];
  const [postData, setPostData] = useState<CreatePostData>({
    title: "",
    content: "",
    category: "General",
    image: undefined,
  });
  const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const resetForm = () => {
    setPostData({
      title: "",
      content: "",
      category: "General",
      image: undefined,
    });
    setSelectedImage(null);
    setShowCategoryPicker(false);
    setImageUploading(false);
    setValidating(false);
    setValidationError(null);
  };

  const handleClose = () => {
    resetForm();
    bottomSheetRef.current?.close();
    onClose();
  };

  // Handle bottom sheet visibility
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        bottomSheetRef.current?.snapToIndex(0);
      }, 100);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!postData.content?.trim() && !selectedImage) {
      Alert.alert("Error", "Please add content or an image to your post");
      return;
    }

    setValidationError(null);
    setValidating(true);

    try {
      // Validate post content with Gemini AI
      console.log("🤖 Validating post content with Gemini...");
      const validation = await geminiValidationService.validatePostContent(
        postData.content || "",
        postData.title,
        postData.category,
        selectedImage?.uri,
      );

      if (!validation.isValid) {
        setValidating(false);
        setValidationError(
          `❌ Post validation failed:\n\n${validation.reasons.join("\n")}\n\n💡 Suggestions:\n${validation.suggestions?.join("\n") || "Please ensure your post is eco-friendly and appropriate."}`,
        );
        return;
      }

      console.log("✅ Post validation passed, submitting...");

      // Convert selectedImage to the format expected by postsService
      const postDataWithImage = {
        ...postData,
        image: selectedImage
          ? {
              uri: selectedImage.uri,
              width: selectedImage.width || 0,
              height: selectedImage.height || 0,
              fileSize: selectedImage.fileSize || 0,
              type: (selectedImage.type as "image" | "video") || "image",
            }
          : undefined,
      };

      const success = await onSubmit(postDataWithImage);
      if (success) {
        resetForm();
        onClose();
      }
    } catch (error) {
      console.error("Post submission error:", error);
      Alert.alert("Error", "Failed to create post");
    } finally {
      setValidating(false);
    }
  };

  const showImagePicker = () => {
    Alert.alert("Select Image", "Choose an option to add a photo", [
      { text: "Cancel", style: "cancel" },
      { text: "Camera", onPress: () => pickImageFromCamera() },
      { text: "Gallery", onPress: () => pickImageFromGallery() },
    ]);
  };

  const pickImageFromGallery = async () => {
    try {
      setImageUploading(true);
      const image = await imageUploadService.pickImage();

      if (image) {
        setSelectedImage(image);
        console.log("Image selected from gallery:", image);
      }
    } catch (error) {
      console.error("Gallery picker error:", error);
      Alert.alert(
        "Gallery Error",
        "Failed to pick image from gallery. Please check permissions.",
      );
    } finally {
      setImageUploading(false);
    }
  };

  const pickImageFromCamera = async () => {
    try {
      setImageUploading(true);
      const image = await imageUploadService.takePhoto();

      if (image) {
        setSelectedImage(image);
        console.log("Photo taken:", image);
      }
    } catch (cameraError) {
      console.error("Camera error:", cameraError);
      Alert.alert(
        "Camera Error",
        "Failed to take photo. Please check camera permissions.",
      );
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={0}
        enablePanDownToClose={true}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        onClose={handleClose}
        style={styles.bottomSheet}
        enableContentPanningGesture={false}
        enableHandlePanningGesture={true}
        enableOverDrag={false}
        handleComponent={BottomSheetHandle}
      >
        <BottomSheetView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Post</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[
                styles.postButton,
                (loading || validating) && styles.postButtonDisabled,
              ]}
              disabled={loading || validating}
            >
              {validating ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.postButtonText}>Validating...</Text>
                </View>
              ) : (
                <Text style={styles.postButtonText}>
                  {loading ? "Posting..." : "Post"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <BottomSheetScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Title Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Title (Optional)</Text>
              <BottomSheetTextInput
                style={styles.titleInput}
                placeholder="Give your post a title..."
                value={postData.title}
                onChangeText={(text) =>
                  setPostData({ ...postData, title: text })
                }
                placeholderTextColor="#999"
                maxLength={100}
              />
            </View>

            {/* Content Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Content</Text>
              <BottomSheetTextInput
                style={styles.contentInput}
                placeholder="Share your eco-friendly thoughts..."
                value={postData.content}
                onChangeText={(text) =>
                  setPostData({ ...postData, content: text })
                }
                placeholderTextColor="#999"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.characterCount}>
                {postData.content?.length || 0}/1000
              </Text>
            </View>

            {/* Validation Error Display */}
            {validationError && (
              <View style={styles.validationErrorContainer}>
                <MaterialIcons name="warning" size={20} color="#e74c3c" />
                <Text style={styles.validationErrorText}>
                  {validationError}
                </Text>
              </View>
            )}

            {/* Category Selector */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Category</Text>
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              >
                <Text style={styles.categoryText}>{postData.category}</Text>
                <MaterialIcons
                  name={
                    showCategoryPicker
                      ? "keyboard-arrow-up"
                      : "keyboard-arrow-down"
                  }
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>

              {showCategoryPicker && (
                <View style={styles.categoryDropdown}>
                  <BottomSheetScrollView
                    style={styles.categoryList}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                  >
                    {categories.map((category, index) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryItem,
                          postData.category === category &&
                            styles.selectedCategory,
                          index === categories.length - 1 &&
                            styles.lastCategoryItem,
                        ]}
                        onPress={() => {
                          setPostData({ ...postData, category });
                          setShowCategoryPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.categoryItemText,
                            postData.category === category &&
                              styles.selectedCategoryText,
                          ]}
                        >
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </BottomSheetScrollView>
                </View>
              )}
            </View>

            {/* Image Section */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Photo (Optional)</Text>

              {selectedImage ? (
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: selectedImage.uri }}
                    style={styles.previewImage}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={removeImage}
                  >
                    <MaterialIcons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.imagePickerButton,
                    imageUploading && styles.imagePickerButtonDisabled,
                  ]}
                  onPress={showImagePicker}
                  disabled={imageUploading}
                >
                  {imageUploading ? (
                    <>
                      <MaterialIcons
                        name="hourglass-empty"
                        size={40}
                        color="#999"
                      />
                      <Text style={styles.imagePickerTextDisabled}>
                        Selecting Image...
                      </Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons
                        name="add-photo-alternate"
                        size={40}
                        color="#4abd3e"
                      />
                      <Text style={styles.imagePickerText}>Add Photo</Text>
                      <Text style={styles.imagePickerSubtext}>
                        Share a photo of your eco-friendly activity
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Tips Section */}
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>💡 Tips for a great post:</Text>
              <Text style={styles.tipText}>
                • Share your eco-friendly actions and experiences
              </Text>
              <Text style={styles.tipText}>• Include photos when possible</Text>
              <Text style={styles.tipText}>
                • Focus on environmental sustainability
              </Text>
              <Text style={styles.tipText}>
                • Use positive, respectful language
              </Text>
              <Text style={styles.tipText}>
                • Inspire others with your green journey
              </Text>
            </View>

            {/* AI Validation Notice */}
            <View style={styles.aiNoticeContainer}>
              <MaterialIcons name="psychology" size={16} color="#4abd3e" />
              <Text style={styles.aiNoticeText}>
                Posts and images are automatically reviewed by AI to ensure
                they&apos;re eco-friendly and appropriate for our community.
              </Text>
            </View>
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 1001,
    zIndex: 1001,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    height: "100%",
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  postButton: {
    backgroundColor: "#4abd3e",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonDisabled: {
    backgroundColor: "#ccc",
  },
  postButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
  },
  contentInput: {
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 4,
  },
  categorySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  categoryText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  categoryDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    backgroundColor: "white",
    maxHeight: 200,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  categoryList: {
    maxHeight: 200,
  },
  categoryItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedCategory: {
    backgroundColor: "#e8f5e8",
  },
  categoryItemText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  selectedCategoryText: {
    color: "#4abd3e",
    fontWeight: "600",
  },
  lastCategoryItem: {
    borderBottomWidth: 0,
  },
  imageContainer: {
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePickerButton: {
    borderWidth: 2,
    borderColor: "#4abd3e",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    backgroundColor: "#f8fff8",
  },
  imagePickerButtonDisabled: {
    borderColor: "#ccc",
    backgroundColor: "#f5f5f5",
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4abd3e",
    marginTop: 8,
  },
  imagePickerSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
  imagePickerTextDisabled: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 8,
  },
  tipsContainer: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  validationErrorContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ffeaea",
    borderColor: "#e74c3c",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  validationErrorText: {
    flex: 1,
    fontSize: 14,
    color: "#c0392b",
    lineHeight: 20,
  },
  aiNoticeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f8ff",
    borderColor: "#4abd3e",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  aiNoticeText: {
    flex: 1,
    fontSize: 12,
    color: "#2c3e50",
    lineHeight: 16,
  },
});

export default CreatePostModal;
