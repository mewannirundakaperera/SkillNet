import React, { useState } from "react";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gray-50">
      <div className="flex flex-1 rounded-2xl m-4 bg-white shadow-lg overflow-hidden">
        {/* Left Side Image */}
        <div className="w-1/2 hidden md:block">
          <img
            src="https://images.unsplash.com/photo-1519389950473-47ba0277781c"
            alt="A laptop on a bed with a notebook and glasses"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right Side Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8">
          <div className="w-full max-w-md">
            <h2 className="text-3xl font-bold text-center text-indigo-500 mb-8">Log in</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  placeholder="example.email@gmail.com"
                  className="w-full border border-gray-200 rounded px-4 py-2 bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  required
                />
              </div>
              {/* Password Input */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter at least 8+ characters"
                    className="w-full border border-gray-200 rounded px-4 py-2 bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 pr-10"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.336-3.236.938-4.675M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.062-4.675A9.956 9.956 0 0122 9c0 5.523-4.477 10-10 10-.657 0-1.299-.064-1.925-.187" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm2.21-2.21A8.963 8.963 0 0121 12c0 4.418-3.582 8-8 8s-8-3.582-8-8c0-1.657.336-3.236.938-4.675" /></svg>
                    )}
                  </button>
                </div>
              </div>
              {/* Terms Checkbox */}
              <div className="flex items-center text-sm">
                <input type="checkbox" className="mr-2" required />
                <span className="text-gray-600">
                  By signing up, I agree with the Terms of Use & Privacy Policy
                </span>
              </div>
              {/* Login Button */}
              <button
                type="submit"
                className="w-full bg-indigo-500 text-white py-3 rounded-lg text-lg font-semibold hover:bg-indigo-600 transition"
              >
                Log in
              </button>
            </form>
            {/* Links */}
            <div className="mt-4 flex justify-center gap-6 text-sm">
              <a href="#" className="text-indigo-500 hover:underline">
                Forget Password?
              </a>
              <a href="/signup" className="text-indigo-500 hover:underline">
                Create an account
              </a>
            </div>
          </div>
        </div>
      </div>
      {/* Footer */}
      <footer className="text-xs text-gray-400 px-6 py-2 flex items-center gap-1">
        Made with <span className="text-indigo-500 font-bold">Visily</span>
      </footer>
    </div>
  );
}