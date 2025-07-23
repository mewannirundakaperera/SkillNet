import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { HiOutlineUpload } from "react-icons/hi";
import { FiUser, FiMail, FiLock } from "react-icons/fi";

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
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
      <div className="w-full md:w-3/5 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-auto max-w-lg">
          {/* Top login link */}
          <div className="text-right mb-6 text-sm text-[#171A1F]">
            Already have an account?{" "}
            <a href="/login" className="underline hover:text-[#636AE8]">
              Log in
            </a>
          </div>

          {/* Heading */}
          <h2 className="text-[32px] leading-[48px] font-bold text-[#2e349a] mb-8">
            Sign up
          </h2>

          {/* Social Buttons */}
          <div className="space-y-px mb-8">
            <button
              type="button"
              className="w-full h-[50px] px-4 flex items-center justify-center gap-[6px] font-medium text-[#FFFFFF] bg-[#DE3B40] hover:bg-[#C12126] active:bg-[#AA1D22] rounded-[6px] transition"
            >
              <FcGoogle className="w-5 h-5" />
              Sign up with Google
            </button>


          </div>

          {/* Divider */}
          <div className="flex items-center my-6">
            <hr className="flex-grow border-gray-300" />
            <span className="mx-2 text-gray-400">OR</span>
            <hr className="flex-grow border-gray-300" />
          </div>

          {/* Form */}
          <form className="space-y-px">
            <div className="grid grid-cols-2 gap-px mb-4">
              <div>
                <label className=" text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FiUser className="mr-2" />
                  First Name
                </label>
                <input
                  type="text"
                  placeholder="John"
                  required
                  className="w-full h-[29px] px-3 text-center text-[18px] leading-[28px] bg-[#F3F4F6] rounded-[6px] border border-gray-300 outline-none hover:text-[#BDC1CA] focus:text-[#000000] focus:bg-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FiUser className="mr-2" />
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="Doe"
                  required
                  className="w-full h-[29px] px-3 text-center text-[18px] leading-[28px] bg-[#F3F4F6] rounded-[6px] border border-gray-300 outline-none hover:text-[#BDC1CA] focus:text-[#000000] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                <FiMail className="mr-2" />
                Email
              </label>
              <input
                type="email"
                placeholder="example.email@gmail.com"
                required
                className="w-full h-[29px] px-3 text-center text-[18px] leading-[28px] bg-[#F3F4F6] rounded-[6px] border border-gray-300 outline-none hover:text-[#BDC1CA] focus:text-[#070708] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 items-center">
                <FiLock className="mr-2" />
                Password
              </label>
              <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter at least 8+ characters"
                className="w-full h-[29px] pl-3 pr-3 font-inter text-[18px] leading-[28px] bg-[#F3F4F6] rounded-[6px]  border-1 outline-none hover:text-[#BDC1CA] focus:text-[#000000] focus:bg-white text-center"
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 space-y-px">
                Upload University Registration Letter
              </label>
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full p-6 border border-dashed border-gray-400 rounded-[6px] cursor-pointer hover:border-blue-500 transition"
              >
                <HiOutlineUpload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-400 text-center">
                  <span className="font-medium">Drag and drop</span> or{" "}
                  <span className="font-medium">browse</span> files
                </p>
                {file && (
                  <p className="mt-2 text-sm text-gray-900 font-medium">
                    {file.name}
                  </p>
                )}
                <input
                  id="file-upload"
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className="flex items-start pt-2 ">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  required
                  className="w-5 h-5 rounded border-gray-300 focus:ring-blue-500"
                />
              </div>
              <label
                htmlFor="terms"
                className="ml-2 text-sm text-gray-700 cursor-pointer "
              >
                By signing up, I agree with the{" "}
                <a href="#" className="text-blue-600 underline">
                  Terms of Use
                </a>{" "}
                &{" "}
                <a href="#" className="text-blue-600 underline">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-[52px] px-5 mt-6 flex items-center justify-center text-[18px] leading-[28px] font-medium text-[#FFFFFF] bg-[#636AE8] hover:bg-[#4850E4] active:bg-[#2C35E0] rounded-[6px] transition"
            >
              Create an account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
