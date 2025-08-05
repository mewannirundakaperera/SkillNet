// src/utils/uploadToCloudinary.js

import axios from 'axios';

export const uploadToCloudinary = async (file) => {
  const cloudName = "dijpdzczq"; // Your actual Cloudinary cloud name
  const uploadPreset = "propic"; // 🔧 Replace with your actual preset name


  console.log("🔍 Starting upload process...");
  console.log("📁 File details:", {
    name: file.name,
    size: file.size,
    type: file.type
  });
  console.log("☁️ Cloudinary config:", {
    cloudName,
    uploadPreset,
    url: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
  });

  // Validate inputs
  if (!cloudName) {
    throw new Error("Cloud name is missing");
  }

  if (!uploadPreset || uploadPreset === "YOUR_UNSIGNED_PRESET" || uploadPreset === "networkpro_uploads") {
    throw new Error("Upload preset is not configured. Please create an unsigned upload preset in your Cloudinary dashboard and update the preset name in your code.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  // Optional: Add folder organization
  // formData.append("folder", "profile_pictures");

  try {
    console.log("🚀 Making request to Cloudinary...");

    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds timeout
      }
    );

    console.log("✅ Upload successful:", res.data);
    return res.data.secure_url;

  } catch (error) {
    console.error("❌ Cloudinary upload failed:", error);

    // Detailed error logging
    if (error.response) {
      // Server responded with error status
      console.error("📋 Response status:", error.response.status);
      console.error("📋 Response data:", error.response.data);
      console.error("📋 Response headers:", error.response.headers);

      const errorMessage = error.response.data?.error?.message ||
                          error.response.data?.message ||
                          `HTTP ${error.response.status} error`;

      throw new Error(`Upload failed: ${errorMessage}`);

    } else if (error.request) {
      // Network error - no response received
      console.error("🌐 Network error - no response:", error.request);
      throw new Error('Network error: Unable to reach Cloudinary. Check your internet connection.');

    } else {
      // Something else went wrong
      console.error("⚙️ Setup error:", error.message);
      throw new Error(`Upload error: ${error.message}`);
    }
  }
};

// Test function to validate configuration
export const testCloudinaryConfig = async () => {
  const cloudName = "dijpdzczq";
  const uploadPreset = "propic"; // Replace with actual preset

  console.log("🧪 Testing Cloudinary configuration...");

  try {
    // Test with a simple ping to check if cloud name is valid
    const response = await axios.get(`https://api.cloudinary.com/v1_1/${cloudName}/image/list`, {
      timeout: 5000
    });

    console.log("✅ Cloud name is valid");
    return true;

  } catch (error) {
    if (error.response?.status === 401) {
      console.log("🔒 Cloud name is valid but requires authentication (this is expected)");
      return true;
    } else {
      console.error("❌ Invalid cloud name or network issue:", error.message);
      return false;
    }
  }
};