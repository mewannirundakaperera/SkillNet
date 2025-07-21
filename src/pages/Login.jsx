import React, { useState } from "react";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-r from-indigo-600 to-blue-500 ">

    
      {/* Left Side Image */}
      <div className="w-1/2 flex items-center justify-center bg-gradient-to-r from-indigo-500 to-blue-700">
        <img
          src="https://images.unsplash.com/photo-1519389950473-47ba0277781c"
          alt="A laptop on a bed with a notebook and glasses"
          className="rounded-lg shadow-lg max-w-full h-full object-cover"
        />
      </div>

      {/* Right Side Form */}
      <div className="w-1/2 flex flex-col justify-center px-8 py-12">
        <div className="w-full max-w-md mx-auto bg-white p-10 rounded-xl shadow-2xl">
          <h2 className="text-4xl font-bold text-indigo-600 mb-8 text-center">Log in</h2>

          <form onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className="mb-6">
              <input
                type="email"
                placeholder="example.email@gmail.com"
                className="w-full border border-gray-300 rounded-lg px-6 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-md"
                required
              />
            </div>

            {/* Password Input */}
            <div className="relative mb-6">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter at least 8+ characters"
                className="w-full border border-gray-300 rounded-lg px-6 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-md"
                minLength={8}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-3 cursor-pointer"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-center mb-6 text-sm">
              <input type="checkbox" className="mr-2" required />
              <span className="text-gray-600">
                By signing up, I agree with the{" "}
                <a href="#" className="text-indigo-500 hover:underline">
                  Terms of Use & Privacy Policy
                </a>
              </span>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-lg text-lg font-semibold hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              Log in
            </button>
          </form>

          {/* Links */}
          <div className="mt-4 text-center text-sm ">
            <a href="/signup" className="text-pink-500 hover:underline mr-4">
              Create an account
            </a>
            <a href="#" className="text-indigo-500 hover:underline">
              Forgot Password?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}