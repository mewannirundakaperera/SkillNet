import React, { useState } from "react";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side Image */}
      <div className="w-1/2 bg-gray-100 flex items-center justify-center">
        <img
          src="https://images.unsplash.com/photo-1519389950473-47ba0277781c"
          alt="A laptop on a bed with a notebook and glasses"
          className="rounded-lg shadow-lg max-w-full"
        />
      </div>
      {/* Right Side Form */}
      <div className="w-1/2 flex flex-col justify-center px-16">
        <div className="w-full max-w-md mx-auto">
          <h2 className="text-3xl font-bold text-indigo-600 mb-6">Log in</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="example.email@gmail.com"
              className="w-full border rounded px-3 py-2 mb-2"
              required
            />
            <div className="relative mb-2">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter at least 8+ characters"
                className="w-full border rounded px-3 py-2"
                minLength={8}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={0}
                className="absolute right-3 top-3 cursor-pointer bg-transparent border-none"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            <div className="flex items-center mb-4">
              <label className="flex items-center text-xs cursor-pointer">
                <input type="checkbox" className="mr-2" required />
                By signing up, I agree with the Terms of Use & Privacy Policy
              </label>
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-500 text-white py-2 rounded font-semibold"
            >
              Log in
            </button>
          </form>
          <div className="mt-4 flex justify-between text-sm">
            <a href="/signup" className="text-pink-500">
              Create an account
            </a>
            <a href="#" className="text-indigo-500">
              Forget Password?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
