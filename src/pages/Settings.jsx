import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";

export default function Settings() {
  const [toggles, setToggles] = useState({
    email: true,
    sms: false,
    desktop: true,
    marketing: false,
    newsletter: false,
    shareUsage: true,
    ads: false,
    twoFactor: false,
  });
  const [profileVisibility, setProfileVisibility] = useState("Public");
  const privacyRef = useRef(null);
  const securityRef = useRef(null);
  const accountRef = useRef(null);

  const handleToggle = (key) => setToggles((t) => ({ ...t, [key]: !t[key] }));
  const handlePrivacyClick = (e) => {
    e.preventDefault();
    if (privacyRef.current) {
      privacyRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };
  const handleSecurityClick = (e) => {
    e.preventDefault();
    if (securityRef.current) {
      securityRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };
  const handleAccountClick = (e) => {
    e.preventDefault();
    if (accountRef.current) {
      accountRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b flex items-center justify-between px-8 py-3">
        <div className="flex items-center gap-2">
          < Link to="/">
          <img src="/vite.svg" alt="Logo" className="h-7 w-7" />
          <span className="font-bold text-lg text-indigo-700">Settings App</span>
          </Link>
        </div>
        <ul className="flex gap-6 text-gray-700 font-medium">
          <li><Link to="#" className="hover:text-indigo-600">Home</Link></li>
          <li><Link to="#" className="hover:text-indigo-600">Dashboard</Link></li>
          <li><Link to="#" className="text-indigo-600 font-semibold">Settings</Link></li>
        </ul>
        <div className="flex items-center gap-4">
          <button className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700">Upgrade</button>
          <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="User" className="h-8 w-8 rounded-full" />
        </div>
      </nav>
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r flex flex-col py-6 px-4 gap-2 min-h-full">
          <nav className="flex-1 flex flex-col gap-2">
            <Link to="#" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-100 text-indigo-600 font-semibold">Profile Settings</Link>
            <Link to="#" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700" onClick={handlePrivacyClick}>Privacy Settings</Link>
            <Link to="#" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700" onClick={handleSecurityClick}>Security Settings</Link>
            <Link to="#" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700" onClick={handleAccountClick}>Account Management</Link>
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            <Link to="#" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Legal & Policies</Link>
          </div>
        </aside>
        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-8 p-8">
          <h1 className="text-3xl font-bold mb-4">Settings</h1>
          {/* Profile Information */}
          <section className="bg-white rounded-xl shadow p-6 mb-2">
            <h2 className="font-semibold mb-4">Profile Information</h2>
            <div className="flex items-center gap-6 mb-4">
              <img src="https://randomuser.me/api/portraits/men/14.jpg" alt="John Doe" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow" />
              <div>
                <div className="font-bold text-lg">John Doe</div>
                <div className="text-gray-500 text-sm mb-2">john.doe@example.com</div>
                <button className="border rounded px-3 py-1 text-xs font-semibold hover:bg-gray-100">Upload new photo</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Full Name</label>
                <input type="text" className="w-full border rounded px-3 py-2 text-sm bg-gray-100" value="John Doe" readOnly />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Email Address</label>
                <input type="text" className="w-full border rounded px-3 py-2 text-sm bg-gray-100" value="john.doe@example.com" readOnly />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Bio</label>
              <textarea className="w-full border rounded px-3 py-2 text-sm bg-gray-100" rows={2} value="A passionate software engineer focused on building robust and user-friendly applications." readOnly />
            </div>
            <div className="mt-4">
              <button className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700">Save Changes</button>
            </div>
          </section>
          {/* Privacy Controls */}
          <section ref={privacyRef} className="bg-white rounded-xl shadow p-6 mb-2">
            <h2 className="font-semibold mb-4">Privacy Controls</h2>
            <div className="flex flex-col gap-2 mb-2">
              <div className="font-semibold text-sm mb-1">Profile Visibility</div>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-2">
                  <input type="radio" name="visibility" checked={profileVisibility === 'Public'} onChange={() => setProfileVisibility('Public')} /> Public
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="visibility" checked={profileVisibility === 'Friends'} onChange={() => setProfileVisibility('Friends')} /> Friends Only
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="visibility" checked={profileVisibility === 'Private'} onChange={() => setProfileVisibility('Private')} /> Private
                </label>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={toggles.shareUsage} onChange={() => handleToggle('shareUsage')} className="accent-indigo-500" />
                Share Usage Data <span className="text-xs text-gray-400">Help us improve by sharing anonymous usage data.</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={toggles.ads} onChange={() => handleToggle('ads')} className="accent-indigo-500" />
                Personalized Ads <span className="text-xs text-gray-400">Receive ads tailored to your interests.</span>
              </label>
            </div>
          </section>
          {/* Account Security */}
          <section ref={securityRef} className="bg-white rounded-xl shadow p-6 mb-2">
            <h2 className="font-semibold mb-4">Account Security</h2>
            <div className="flex flex-col gap-2 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">Change Password</span>
                <button className="ml-auto border rounded px-3 py-1 text-xs font-semibold hover:bg-gray-100">Change Password</button>
              </div>
              <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={toggles.twoFactor} onChange={() => handleToggle('twoFactor')} className="accent-indigo-500" />
                Two-Factor Authentication <span className="text-xs text-gray-400">Add an extra layer of security to your account.</span>
              </label>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">Active Sessions</span>
                <button className="ml-auto border rounded px-3 py-1 text-xs font-semibold hover:bg-gray-100">Log Out All Other Sessions</button>
              </div>
            </div>
          </section>
          {/* Account Management */}
          <section ref={accountRef} className="bg-white rounded-xl shadow p-6 mb-2">
            <h2 className="font-semibold mb-4">Account Management</h2>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-red-500">Delete Account</span>
              <button className="ml-auto bg-red-500 text-white rounded px-4 py-2 font-semibold hover:bg-red-600">Delete Account</button>
            </div>
            <button className="border rounded px-4 py-2 font-semibold hover:bg-gray-100 mt-2">Logout</button>
          </section>
          {/* Footer */}
          <footer className="mt-12 text-center text-gray-400 text-sm">
            <div>SettingsApp Co.</div>
            <div className="mt-2">Stay updated with our newsletter!</div>
            <form className="flex justify-center items-center gap-2 mt-2">
              <input type="email" placeholder="Your email address" className="px-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              <button className="bg-blue-600 text-white rounded px-4 py-2 font-medium text-sm">Subscribe</button>
            </form>
            <div className="mt-4">© 2023 SettingsApp Co..</div>
          </footer>
        </main>
      </div>
    </div>
  );
}
