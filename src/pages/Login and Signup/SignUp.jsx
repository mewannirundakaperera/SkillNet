import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { HiOutlineUpload } from "react-icons/hi";
import { FiUser, FiMail, FiLock } from "react-icons/fi";
import { signUp } from "@services/authService";
import { UserCollectionService } from "@/services/user.js"; // Import the service
import { useNavigate } from "react-router-dom";

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [file, setFile] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/(?=.*[a-z])/.test(password)) strength++;
    if (/(?=.*[A-Z])/.test(password)) strength++;
    if (/(?=.*\d)/.test(password)) strength++;
    if (/(?=.*[@$!%*?&])/.test(password)) strength++;
    return Math.min(strength, 4);
  };

  const getPasswordStrengthText = (strength) => {
    const texts = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return texts[strength] || 'Very Weak';
  };

  const validateForm = () => {
    const errors = {};

    // First Name validation
    if (!firstName.trim()) {
      errors.firstName = "First name is required";
    } else if (firstName.trim().length < 2) {
      errors.firstName = "First name must be at least 2 characters";
    } else if (!/^[a-zA-Z\s]+$/.test(firstName.trim())) {
      errors.firstName = "First name can only contain letters";
    }

    // Last Name validation
    if (!lastName.trim()) {
      errors.lastName = "Last name is required";
    } else if (lastName.trim().length < 2) {
      errors.lastName = "Last name must be at least 2 characters";
    } else if (!/^[a-zA-Z\s]+$/.test(lastName.trim())) {
      errors.lastName = "Last name can only contain letters";
    }

    // Email validation
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!password) {
      errors.password = "Password is required";
    } else {
      const passwordErrors = [];
      if (password.length < 8) {
        passwordErrors.push("at least 8 characters");
      }
      if (!/(?=.*[a-z])/.test(password)) {
        passwordErrors.push("one lowercase letter");
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        passwordErrors.push("one uppercase letter");
      }
      if (!/(?=.*\d)/.test(password)) {
        passwordErrors.push("one number");
      }
      if (!/(?=.*[@$!%*?&])/.test(password)) {
        passwordErrors.push("one special character (@$!%*?&)");
      }

      if (passwordErrors.length > 0) {
        errors.password = `Password must contain ${passwordErrors.join(", ")}`;
      }
    }

    // File validation (optional but recommended format)
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        errors.file = "Only PDF, JPEG, JPG, and PNG files are allowed";
      } else if (file.size > maxSize) {
        errors.file = "File size must be less than 5MB";
      }
    }

    return errors;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setValidationErrors({});

    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`;

      // Step 1: Create Firebase auth user
      const authResult = await signUp(email.trim(), password, displayName);

      if (authResult.success) {
        console.log("🔥 Firebase auth user created:", authResult.user.uid);

        // Step 2: Create user profiles in both collections
        try {
          const userData = {
            uid: authResult.user.uid,
            email: email.trim(),
            displayName: displayName,
            name: displayName, // For compatibility
            bio: `Hello! I'm ${firstName}, welcome to connect with me on Skill-Net.`,
            location: "",
            skills: [],
            interests: [],
            avatar: authResult.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3b82f6&color=fff`,
            photoURL: authResult.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3b82f6&color=fff`,
            profileComplete: false
          };

          // Use the service to create both private and public profiles
          await UserCollectionService.createUser(userData);

          console.log("✅ User profiles created successfully");

          // Navigate to homepage
          navigate("/");

        } catch (profileError) {
          console.error("❌ Error creating user profiles:", profileError);
          setError("Account created but profile setup failed. Please try logging in and completing your profile.");

          // Still navigate since Firebase auth succeeded
          setTimeout(() => navigate("/"), 2000);
        }

      } else {
        setError(authResult.error || "Failed to create account");
      }

    } catch (error) {
      console.error("💥 Sign up failed:", error);
      setError("Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full lg:flex-row">
      {/* Left Side Image */}
      <div className="w-full md:w-2/5 h-auto">
        <img
          src="https://images.unsplash.com/photo-1519389950473-47ba0277781c"
          alt="Laptop on bed"
          className="object-cover w-full h-full"
        />
      </div>

      {/* Right Side Form */}
      <div className="w-full md:w-3/5 flex items-center justify-center bg-[#1A202C] px-8 py-12">
        <div className="w-auto max-w-lg">
          {/* Top login link */}
          <div className="text-right mb-6 text-sm text-[#E0E0E0]">
            Already have an account?{" "}
            <a href="/login" className="underline hover:text-[#4299E1] transition-colors">
              Log in
            </a>
          </div>

          {/* Heading */}
          <h2 className="text-[32px] leading-[48px] font-bold text-[#4299E1] mb-8">
            Sign up
          </h2>

          {/* Social Buttons */}
          <div className="space-y-px mb-8">
            <button
              type="button"
              className="w-full h-[50px] px-4 flex items-center justify-center gap-[6px] font-medium text-[#FFFFFF] bg-[#DE3B40] hover:bg-[#C12126] active:bg-[#AA1D22] rounded-[6px] transition"
              disabled={loading}
            >
              <FcGoogle className="w-5 h-5" />
              Sign up with Google
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center my-6">
            <hr className="flex-grow border-[#4A5568]" />
            <span className="mx-2 text-[#A0AEC0]">OR</span>
            <hr className="flex-grow border-[#4A5568]" />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 text-red-400 rounded">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignUp} className="space-y-px">
            <div className="grid grid-cols-2 gap-px mb-4">
              <div>
                <label className="text-sm font-medium text-white mb-1 flex items-center">
                  <FiUser className="mr-2" />
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                  disabled={loading}
                  className={`input-dark w-full h-[29px] px-3 text-center text-[18px] leading-[28px] rounded-[6px] outline-none hover:text-[#A0AEC0] focus:text-white focus:bg-[#2D3748] ${
                    validationErrors.firstName ? 'border-red-500' : 'border-[#4A5568]'
                  }`}
                />
                {validationErrors.firstName && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.firstName}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-white mb-1 flex items-center">
                  <FiUser className="mr-2" />
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                  disabled={loading}
                  className={`input-dark w-full h-[29px] px-3 text-center text-[18px] leading-[28px] rounded-[6px] outline-none hover:text-[#A0AEC0] focus:text-white focus:bg-[#2D3748] ${
                    validationErrors.lastName ? 'border-red-500' : 'border-[#4A5568]'
                  }`}
                />
                {validationErrors.lastName && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-1 flex items-center">
                <FiMail className="mr-2" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example.email@gmail.com"
                required
                disabled={loading}
                className={`input-dark w-full h-[29px] px-3 text-center text-[18px] leading-[28px] rounded-[6px] outline-none hover:text-[#A0AEC0] focus:text-white focus:bg-[#2D3748] ${
                  validationErrors.email ? 'border-red-500' : 'border-[#4A5568]'
                }`}
              />
              {validationErrors.email && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1 flex items-center">
                <FiLock className="mr-2" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter at least 8+ characters"
                  minLength={8}
                  required
                  disabled={loading}
                  className={`input-dark w-full h-[29px] pl-3 pr-10 font-inter text-[18px] leading-[28px] rounded-[6px] outline-none hover:text-[#A0AEC0] focus:text-white focus:bg-[#2D3748] text-center ${
                    validationErrors.password ? 'border-red-500' : 'border-[#4A5568]'
                  }`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-2.5 text-[#A0AEC0] hover:text-[#E0E0E0] transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.336-3.236.938-4.675" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.password}</p>
              )}

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="text-xs text-[#A0AEC0] mb-1">Password strength:</div>
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => {
                      const strength = getPasswordStrength(password);
                      return (
                        <div
                          key={i}
                          className={`h-1 w-full rounded ${
                            i < strength
                              ? strength === 1
                                ? 'bg-red-500'
                                : strength === 2
                                ? 'bg-yellow-500'
                                : strength === 3
                                ? 'bg-[#4299E1]'
                                : 'bg-green-500'
                              : 'bg-[#4A5568]'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="text-xs mt-1 text-[#E0E0E0]">
                    {getPasswordStrengthText(getPasswordStrength(password))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1 space-y-px">
                Upload University Registration Letter
              </label>
              <label
                htmlFor="file-upload"
                className={`flex flex-col items-center justify-center w-full p-6 border border-dashed rounded-[6px] cursor-pointer hover:border-[#4299E1] transition-colors ${
                  validationErrors.file ? 'border-red-500' : 'border-[#4A5568]'
                }`}
              >
                <HiOutlineUpload className="w-8 h-8 text-[#A0AEC0] mb-2" />
                <p className="text-sm text-[#A0AEC0] text-center">
                  <span className="font-medium">Drag and drop</span> or{" "}
                  <span className="font-medium">browse</span> files
                </p>
                <p className="text-xs text-[#718096] mt-1">
                  PDF, JPEG, JPG, PNG (Max 5MB)
                </p>
                {file && (
                  <p className="mt-2 text-sm text-white font-medium">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.jpeg,.jpg,.png"
                  className="sr-only"
                  onChange={handleFileChange}
                  disabled={loading}
                />
              </label>
              {validationErrors.file && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.file}</p>
              )}
            </div>

            <div className="flex items-start pt-2">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  required
                  disabled={loading}
                  className="w-5 h-5 rounded border-[#4A5568] focus:ring-[#4299E1] text-[#4299E1]"
                />
              </div>
              <label
                htmlFor="terms"
                className="ml-2 text-sm text-white cursor-pointer"
              >
                By signing up, I agree with the{" "}
                <a href="#" className="text-[#4299E1] underline hover:text-[#00BFFF] transition-colors">
                  Terms of Use
                </a>{" "}
                &{" "}
                <a href="#" className="text-[#4299E1] underline hover:text-[#00BFFF] transition-colors">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              className="btn-gradient-primary w-full h-[52px] px-5 mt-6 flex items-center justify-center text-[18px] leading-[28px] font-medium rounded-[6px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Creating account...
                </>
              ) : (
                "Create an account"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}