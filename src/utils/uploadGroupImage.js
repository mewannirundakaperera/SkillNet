// src/utils/uploadGroupImage.js

import axios from 'axios';

// Cloudinary configuration for group images
const CLOUDINARY_CONFIG = {
  cloudName: 'dijpdzczq', // Your existing cloud name
  uploadPreset: 'Grouppic' // Group photo preset
};

export const uploadGroupImageToCloudinary = async (file) => {
  try {
    if (!file) return null;

    console.log("🔍 Starting group image upload process...");
    console.log("📁 File details:", {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select a valid image file');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image size should be less than 5MB');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', 'group-images'); // Organize in folders

    console.log("🚀 Making request to Cloudinary for group image...");
    console.log("☁️ Using preset:", CLOUDINARY_CONFIG.uploadPreset);

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds timeout
      }
    );

    console.log("✅ Group image upload successful:", response.data);
    return response.data.secure_url;

  } catch (error) {
    console.error("❌ Group image upload failed:", error);

    // Detailed error logging
    if (error.response) {
      console.error("📋 Response status:", error.response.status);
      console.error("📋 Response data:", error.response.data);

      const errorMessage = error.response.data?.error?.message ||
                          error.response.data?.message ||
                          `HTTP ${error.response.status} error`;

      throw new Error(`Group image upload failed: ${errorMessage}`);

    } else if (error.request) {
      console.error("🌐 Network error - no response:", error.request);
      throw new Error('Network error: Unable to reach Cloudinary. Check your internet connection.');

    } else {
      console.error("⚙️ Setup error:", error.message);
      throw new Error(`Group image upload error: ${error.message}`);
    }
  }
};

// Test function to validate group image upload configuration
export const testGroupImageUploadConfig = async () => {
  console.log("🧪 Testing group image upload configuration...");
  console.log("☁️ Cloud name:", CLOUDINARY_CONFIG.cloudName);
  console.log("🔧 Upload preset:", CLOUDINARY_CONFIG.uploadPreset);

  try {
    // Test with a simple ping to check if cloud name is valid
    const response = await axios.get(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/list`,
      { timeout: 5000 }
    );

    console.log("✅ Cloud name is valid for group images");
    return true;

  } catch (error) {
    if (error.response?.status === 401) {
      console.log("🔒 Cloud name is valid but requires authentication (this is expected for group images)");
      return true;
    } else {
      console.error("❌ Invalid cloud name or network issue for group images:", error.message);
      return false;
    }
  }
};