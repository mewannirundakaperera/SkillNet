import React from "react";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar */}


      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 flex flex-col gap-8">
          {/* Welcome Banner */}
          <section className="bg-white rounded-xl shadow p-8 flex flex-col items-center text-center mb-2">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome Back, Alex!</h1>
            <p className="text-gray-500 mb-6">Connect. Collaborate. Grow. Your professional journey starts here.</p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-blue-700">Explore Your Network</button>
          </section>

          {/* Recent Activities */}
          <section className="bg-white rounded-xl shadow p-6 mb-2">
            <h2 className="text-xl font-bold mb-4">Recent Activities</h2>
            <ul className="flex flex-col gap-4">
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="https://randomuser.me/api/portraits/women/10.jpg" alt="Alice Johnson" className="w-8 h-8 rounded-full" />
                  <span><b className="text-blue-700">Alice Johnson</b> connected with you</span>
                  <span className="text-gray-400 text-xs ml-2">2 hours ago</span>
                </div>
                <Link to="#" className="text-blue-600 text-sm font-medium">View Profile</Link>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="https://randomuser.me/api/portraits/men/11.jpg" alt="Bob Williams" className="w-8 h-8 rounded-full" />
                  <span><b className="text-blue-700">Bob Williams</b> joined "AI & Machine Learning" group</span>
                  <span className="text-gray-400 text-xs ml-2">5 hours ago</span>
                </div>
                <span className="text-gray-400 text-sm">Exploiting the latest breakthroughs in neural networks and deep learning.</span>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="https://randomuser.me/api/portraits/men/12.jpg" alt="Charlie Davis" className="w-8 h-8 rounded-full" />
                  <span><b className="text-blue-700">Charlie Davis</b> liked your post</span>
                  <span className="text-gray-400 text-xs ml-2">1 day ago</span>
                </div>
                <span className="text-gray-400 text-sm">"Insights on Q3 Market Trends"</span>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="https://randomuser.me/api/portraits/women/13.jpg" alt="Diana Prince" className="w-8 h-8 rounded-full" />
                  <span><b className="text-blue-700">Diana Prince</b> connected with you</span>
                  <span className="text-gray-400 text-xs ml-2">3 days ago</span>
                </div>
                <Link to="#" className="text-blue-600 text-sm font-medium">View Profile</Link>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="https://randomuser.me/api/portraits/men/15.jpg" alt="Eve Green" className="w-8 h-8 rounded-full" />
                  <span><b className="text-blue-700">Eve Green</b> started a new discussion in "Product Management Forum"</span>
                  <span className="text-gray-400 text-xs ml-2">1 week ago</span>
                </div>
                <span className="text-gray-400 text-sm">"Best Practices for Agile Product Roadmapping"</span>
              </li>
            </ul>
          </section>

          {/* Trending Topics */}
          <section className="bg-white rounded-xl shadow p-6 mb-2">
            <h2 className="text-xl font-bold mb-4">Trending Topics</h2>
            <ul className="flex flex-col gap-3">
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-orange-500 text-xl"><i className="fas fa-briefcase"></i>🧳</span>
                  <span>Future of Work</span>
                </div>
                <span className="text-gray-400 text-sm">1,200 Posts</span>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-orange-500 text-xl"><i className="fas fa-robot"></i>🤖</span>
                  <span>Generative AI Ethics</span>
                </div>
                <span className="text-gray-400 text-sm">850 Posts</span>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-orange-500 text-xl"><i className="fas fa-leaf"></i>🌱</span>
                  <span>Sustainable Business Practices</span>
                </div>
                <span className="text-gray-400 text-sm">620 Posts</span>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-orange-500 text-xl"><i className="fas fa-lightbulb"></i>💡</span>
                  <span>Leadership in Digital Transformation</span>
                </div>
                <span className="text-gray-400 text-sm">910 Posts</span>
              </li>
            </ul>
          </section>
        </div>

        {/* Right Sidebar */}
        <aside className="w-full lg:w-96 flex flex-col gap-8">
          {/* Dashboard */}
          <section className="bg-white rounded-xl shadow p-6 flex flex-col items-center mb-2">
            <h3 className="text-base font-bold mb-2">My Dashboard</h3>
            <div className="flex gap-8 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-700">1,250</div>
                <div className="text-gray-500 text-sm">Connections</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700">42</div>
                <div className="text-gray-500 text-sm">Groups Joined</div>
              </div>
            </div>
          </section>

          {/* Suggested Groups */}
          <section className="bg-white rounded-xl shadow p-6 mb-2">
            <h3 className="text-base font-bold mb-4">Suggested Groups</h3>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 items-center">
                <img src="https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=facearea&w=96&h=96" alt="AI Group" className="w-16 h-16 rounded object-cover" />
                <div className="flex-1">
                  <div className="font-semibold">AI & Machine Learning Innovators</div>
                  <div className="text-xs text-gray-500 mb-1">15,432 Members</div>
                  <div className="text-xs text-gray-500">A community for professionals and enthusiasts</div>
                </div>
                <button className="bg-blue-600 text-white rounded px-4 py-2 font-medium text-xs">Join Group</button>
              </div>
              <div className="flex gap-4 items-center">
                <img src="https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=facearea&w=96&h=96" alt="Product Group" className="w-16 h-16 rounded object-cover" />
                <div className="flex-1">
                  <div className="font-semibold">Product Management Forum</div>
                  <div className="text-xs text-gray-500 mb-1">8,765 Members</div>
                  <div className="text-xs text-gray-500">Dedicated to product managers, owners, and</div>
                </div>
                <button className="bg-blue-600 text-white rounded px-4 py-2 font-medium text-xs">Join Group</button>
              </div>
              <div className="flex gap-4 items-center">
                <img src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=facearea&w=96&h=96" alt="Startup Group" className="w-16 h-16 rounded object-cover" />
                <div className="flex-1">
                  <div className="font-semibold">Startup Founders Network</div>
                  <div className="text-xs text-gray-500 mb-1">4,120 Members</div>
                  <div className="text-xs text-gray-500">Connect with fellow entrepreneurs, share challenges,</div>
                </div>
                <button className="bg-blue-600 text-white rounded px-4 py-2 font-medium text-xs">Join Group</button>
              </div>
              <div className="flex gap-4 items-center">
                <img src="https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?auto=format&fit=facearea&w=96&h=96" alt="Marketing Group" className="w-16 h-16 rounded object-cover" />
                <div className="flex-1">
                  <div className="font-semibold">Digital Marketing Masters</div>
                  <div className="text-xs text-gray-500 mb-1">11,200 Members</div>
                  <div className="text-xs text-gray-500">A hub for digital marketers to discuss SEO, SEM,</div>
                </div>
                <button className="bg-blue-600 text-white rounded px-4 py-2 font-medium text-xs">Join Group</button>
              </div>
            </div>
          </section>

          {/* Premium Features Card */}
          <section className="bg-gradient-to-r from-orange-400 to-pink-500 rounded-xl shadow p-6 flex flex-col items-center text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">★</span>
              <span className="font-bold text-lg">Unlock Premium Features</span>
            </div>
            <p className="text-sm mb-4 text-center">Access advanced analytics, exclusive groups, and boosted visibility to accelerate your career.</p>
            <button className="bg-white text-orange-500 font-bold rounded px-6 py-2 text-sm shadow hover:bg-orange-50">Upgrade Now</button>
          </section>
        </aside>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-100 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
        <span>© 2020 NetworkPro. All rights reserved.</span>
        <span className="flex items-center gap-1 text-xs">Made with <span className="text-blue-600 font-bold">Visily</span></span>
      </footer>
    </div>
  );
}