// src/components/HomePage.jsx

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Hero */}
      <section className="bg-indigo-800 text-white py-20 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Welcome to SkillNet
        </h1>
        <p className="text-lg mb-8">
          Learn & Teach Beyond Classrooms — Connect with verified students and share your skills.
        </p>
        <div className="space-x-4">
          <a href="/signup" className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
            Get Started
          </a>
          <a href="/login" className="inline-block bg-white text-indigo-800 px-6 py-3 rounded-lg font-semibold border border-white">
            Log In
          </a>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-8">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="font-semibold mb-2">1️⃣ Register</h3>
            <p>Sign up and verify your student status with your university letter.</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="font-semibold mb-2">2️⃣ Join Communities</h3>
            <p>Connect in your course and public community.</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="font-semibold mb-2">3️⃣ Teach & Learn</h3>
            <p>Offer your skills or get help — one-to-one or group.</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="font-semibold mb-2">4️⃣ Connect & Grow</h3>
            <p>Schedule, pay, learn and grow together securely.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-white text-center">
        <h2 className="text-3xl font-bold mb-8">Why SkillNet?</h2>
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold mb-2">✅ Verified Community</h3>
            <p>Only students from your university can join.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">📹 Video & Audio</h3>
            <p>Talk face-to-face or just chat — your choice.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">💸 Free & Paid</h3>
            <p>Teach for free or earn a fee — it’s flexible.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">👥 Groups & 1-to-1</h3>
            <p>Host sessions for one student or a group.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-indigo-800 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to join SkillNet?</h2>
        <p className="mb-8">Connect with peers and share knowledge today!</p>
        <a href="/signup" className="inline-block bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold">
          Join Now
        </a>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-100 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} SkillNet University Platform. All rights reserved.
      </footer>
    </main>
  );
}
