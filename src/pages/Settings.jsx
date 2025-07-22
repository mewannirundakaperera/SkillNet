import React, { useState } from "react";
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

  const handleToggle = (key) => setToggles((t) => ({ ...t, [key]: !t[key] }));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b flex items-center justify-between px-8 py-3">
        <div className="flex items-center gap-2">
          <img src="/vite.svg" alt="Logo" className="h-7 w-7" />
          <span className="font-bold text-lg text-indigo-700">Settings App</span>
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
            <Link to="#" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Notification Settings</Link>
            <Link to="#" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Privacy Settings</Link>
            <Link to="#" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Security Settings</Link>
            <Link to="#" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Data & Storage</Link>
            <Link to="#" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Account Management</Link>
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
          {/* Notification Preferences */}
          <section className="bg-white rounded-xl shadow p-6 mb-2">
            <h2 className="font-semibold mb-4">Notification Preferences</h2>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={toggles.email} onChange={() => handleToggle('email')} className="accent-indigo-500" />
                Email Notifications <span className="text-xs text-gray-400">Receive updates via email.</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={toggles.sms} onChange={() => handleToggle('sms')} className="accent-indigo-500" />
                SMS Notifications <span className="text-xs text-gray-400">Get important alerts on your phone.</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={toggles.desktop} onChange={() => handleToggle('desktop')} className="accent-indigo-500" />
                Desktop Notifications <span className="text-xs text-gray-400">Show notifications directly on your desktop.</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={toggles.marketing} onChange={() => handleToggle('marketing')} className="accent-indigo-500" />
                Marketing Emails <span className="text-xs text-gray-400">Receive promotional offers and updates.</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={toggles.newsletter} onChange={() => handleToggle('newsletter')} className="accent-indigo-500" />
                Newsletter Subscription <span className="text-xs text-gray-400">Subscribe to our monthly newsletter.</span>
              </label>
            </div>
          </section>
          {/* Privacy Controls */}
          <section className="bg-white rounded-xl shadow p-6 mb-2">
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
          <section className="bg-white rounded-xl shadow p-6 mb-2">
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
          {/* Data & Storage */}
          <section className="bg-white rounded-xl shadow p-6 mb-2">
            <h2 className="font-semibold mb-4">Data & Storage</h2>
            <div className="flex flex-col gap-2 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">Export User Data</span>
                <button className="ml-auto border rounded px-3 py-1 text-xs font-semibold hover:bg-gray-100">Export Data</button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">Clear Cache</span>
                <button className="ml-auto border rounded px-3 py-1 text-xs font-semibold hover:bg-gray-100">Clear Cache</button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">Storage Usage</span>
                <div className="flex-1 h-2 bg-gray-200 rounded mx-2">
                  <div className="h-2 bg-indigo-400 rounded" style={{ width: "30%" }}></div>
                </div>
                <span className="text-xs text-gray-400">30%</span>
              </div>
            </div>
          </section>
          {/* Account Management */}
          <section className="bg-white rounded-xl shadow p-6 mb-2">
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
