import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebookF, FaApple } from "react-icons/fa";


export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen w-full lg:flex-row">
      {/* Left Side Image */}
      <div className="w-full md:w-1/2 h-screen">
        <img
          src="https://images.unsplash.com/photo-1519389950473-47ba0277781c"
          alt="Laptop on bed"
          className="object-cover w-full h-full"
        />
      </div>
      {/* Right Side Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-auto max-w-lg">
          {/* Top login link */}
          <div className="text-right mb-6 text-sm text-[#171A1F] font-[Archivo]">
            Already have an account?{" "}
            <a href="/login" className="underline hover:text-[#636AE8]">
              Log in
            </a>
          </div>

          {/* Heading */}
          <h2 className="text-[32px] leading-[48px] font-bold text-[#2e349a] mb-8 font-[Archivo]">
            Sign up
          </h2>

          {/* Social Buttons */}
          <div className="space-y-px mb-8 ">
            <button className="w-full h-[50px] px-4 flex items-center justify-center font-inter text-[16px] font-medium text-[#FFFFFF] bg-[#DE3B40] hover:bg-[#C12126] active:bg-[#AA1D22] rounded-[6px] gap-[6px] transition">
              <FcGoogle className="w-5 h-5 mr-2" />
              Sign up with Google
            </button>

            <button className="w-full h-[50px] px-4 flex items-center justify-center font-inter text-[16px] font-medium text-[#FFFFFF] bg-[#335CA6] hover:bg-[#233F72] active:bg-[#172A4C] rounded-[6px] gap-[6px] transition">
              <FaFacebookF className="w-5 h-5 mr-2 " />
              Sign up with Facebook
            </button>

            <button className="w-full h-[50px] px-4 flex items-center justify-center font-inter text-[16px] font-medium text-[#FFFFFF] bg-[#9095A1] hover:bg-[#6F7787] active:bg-[#565D6D] rounded-[6px] gap-[6px] transition">
              <FaApple className="w-5 h-5 mr-2" />
              Sign up with Apple
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center mb-6">
            <hr className="flex-grow border-gray-300" />
            <span className="mx-2 text-gray-400">OR</span>
            <hr className="flex-grow border-gray-300" />
          </div>

          {/* Form Fields */}
          <form className="space-y-px">
            <div className="grid grid-cols-2 gap-px mb-6">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 mb-1" // Unchanged
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Input first name"
                  className="w-full h-[29px] pl-3 pr-3 font-inter text-[18px] leading-[28px] bg-[#F3F4F6] rounded-[6px]  border-1 outline-none hover:text-[#BDC1CA] focus:text-[#BDC1CA] focus:bg-white text-center" // Add text-center here
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 mb-1" // Unchanged
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Input last name"
                  className="w-full h-[29px] pl-3 pr-3 font-inter text-[18px] leading-[28px] bg-[#F3F4F6] rounded-[6px]  border-1 outline-none hover:text-[#BDC1CA] focus:text-[#BDC1CA] focus:bg-white text-center" // Add text-center here
                />
              </div>
            </div>
            <label className="block mb-2 text-gray-700 font-medium">
              Email
            </label>
            <input
              type="email"
              placeholder="example.email@gmail.com"
              className="w-full h-[29px] pl-3 pr-3 font-inter text-[18px] leading-[28px] bg-[#F3F4F6] rounded-[6px]  border-1 outline-none hover:text-[#BDC1CA] focus:text-[#BDC1CA] focus:bg-white text-center"
            />

            <label className="block mb-2 text-gray-700 font-medium">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter at least 8+ characters"
                className="w-full h-[29px] pl-3 pr-3 font-inter text-[18px] leading-[28px] bg-[#F3F4F6] rounded-[6px]  border-1 outline-none hover:text-[#BDC1CA] focus:text-[#BDC1CA] focus:bg-white text-center"
              />
              <button
                type="button"
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {/* Eye Icon changes can be added here */}
              </button>
            </div>

            <br />
            <label className="block mb-2 text-gray-700 font-medium">
              Upload University Registration Letter
            </label>
            <div className="mb-6 border border-dashed border-gray-400 rounded cursor-pointer hover:border-blue-500">
              <input
                type="file"
                className="opacity-0 w-full h-16 cursor-pointer"
              />
              <div className="flex items-center justify-center h-16 text-gray-400">
                Drag and drop or browse files
              </div>
            </div>
            <br />

            <div className="flex items-center space-x-2">
              <label
                htmlFor="terms"
                className="flex items-center space-x-2 cursor-pointer select-none gap-[6px]"
              >
                <input
                  type="checkbox"
                  id="terms"
                  className="w-5 h-5 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-700 text-sm">
                  By signing up, I agree with the{" "}
                  <a href="#" className="text-blue-600 underline">
                    Terms of Use
                  </a>{" "}
                  &{" "}
                  <a href="#" className="text-blue-600 underline">
                    Privacy Policy
                  </a>
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-[52px] px-5 flex items-center justify-center font-inter text-[18px] leading-[28px] text-[#FFFFFF] bg-[#636AE8] hover:bg-[#4850E4] active:bg-[#2C35E0] rounded-[6px] transition"
            >
              Create an account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
