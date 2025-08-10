import React, { useState } from "react";
import { Link } from "react-router-dom";

const groups = [
  {
    name: "Frontend Devs Guild",
    members: 1250,
    desc: "A vibrant community for frontend developers to share knowledge, advice, and resources.",
    tags: ["Web Dev", "React", "Angular", "CSS"],
    note: "New post: 'Optimizing Core Web Vitals' by Alex D.",
  },
  {
    name: "Designers Collective",
    members: 890,
    desc: "Connect with UI/UX designers, graphic artists, and illustrators.",
    tags: ["UI/UX", "Figma", "Sketch", "Photoshop", "Branding"],
    note: "Event: 'Figma Workshop' next Friday!",
  },
  {
    name: "Data Science Hub",
    members: 1520,
    desc: "For data enthusiasts, scientists, and analysts. Discuss machine learning, AI, and more.",
    tags: ["AI", "ML", "Python", "R", "Statistics"],
    note: "Article: 'Latest in NLP research' just shared.",
  },
  {
    name: "Product Managers Circle",
    members: 710,
    desc: "A peer group for product managers to exchange insights on product strategy and leadership.",
    tags: ["Product Management", "Agile", "Strategy", "UX", "Roadmapping"],
    note: "Discussion: 'Balancing features and deadlines' ongoing.",
  },
  {
    name: "Content Creators League",
    members: 630,
    desc: "Join writers, videographers, podcasters, and bloggers. Learn and grow together.",
    tags: ["Content Marketing", "SEO", "Video", "Podcasting"],
    note: "Tip: 'Best practices for YouTube thumbnails' posted.",
  },
  {
    name: "Cybersecurity Forum",
    members: 980,
    desc: "Discuss current threats, best practices, and career opportunities in cybersecurity.",
    tags: ["Security", "PenTesting", "Cloud Security", "Networking"],
    note: "Alert: 'New ransomware variant identified' shared.",
  },
  {
    name: "Blockchain Innovators",
    members: 450,
    desc: "Explore the world of decentralized technologies, cryptocurrencies, and NFTs.",
    tags: ["Blockchain", "Crypto", "DeFi", "NFTs", "Web3"],
    note: "AMA with a DApp developer on Tuesday.",
  },
  {
    name: "Gaming Enthusiasts HQ",
    members: 2100,
    desc: "From casual gamers to competitive players, discuss new releases, gaming PCs, and more.",
    tags: ["Gaming", "PC Gaming", "Console Gaming", "Esports"],
    note: "Poll: 'What's your favorite game of 2024?'",
  },
  {
    name: "Sustainable Living Network",
    members: 320,
    desc: "Share eco-friendly tips, discuss sustainable practices, and connect with like-minded individuals.",
    tags: ["Sustainability", "Eco-friendly", "Green Tech", "Environment"],
    note: "Recipe: 'Zero-waste cooking ideas' published.",
  },
];

const myGroups = [
  {
    name: "Designers Collective",
    note: "You responded to 'Seeking feedback on a new portfolio design.'",
  },
  {
    name: "Product Managers Circle",
    note: "You posted a question about user onboarding.",
  },
  {
    name: "Content Creators League",
    note: "Your article '10 Tips for Better Blogging' was featured!",
  },
];

const trendingGroups = [
  { name: "Blockchain Innovators", members: 450 },
  { name: "Gaming Enthusiasts HQ", members: 2100 },
  { name: "Sustainable Living Network", members: 320 },
];

export default function JoinGroup() {
  const [search, setSearch] = useState("");
  return (
    <div className="min-h-screen bg-[#1A202C] flex flex-col">
      {/* Top Navbar */}
      <nav className="card-dark border-b border-[#4A5568] flex items-center justify-between px-8 py-3">
        <div className="flex items-center gap-2">
          <Link to="/">
          <span className="font-bold text-lg text-[#4299E1]">CommunityHub</span>
          </Link>
        </div>
        <ul className="flex gap-6 text-[#E0E0E0] font-medium">
          <li><Link to="#" className="hover:text-[#4299E1] transition-colors">Dashboard</Link></li>
          <li><Link to="#" className="text-[#4299E1] font-semibold">Community Hub</Link></li>
          <li><Link to="#" className="hover:text-[#4299E1] transition-colors">Events</Link></li>
          <li><Link to="#" className="hover:text-[#4299E1] transition-colors">Resources</Link></li>
        </ul>
        <div className="flex items-center gap-4">
          <input type="text" placeholder="Search anything..." className="input-dark border border-[#4A5568] rounded px-3 py-2 text-sm w-64" />
          <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="User" className="h-8 w-8 rounded-full" />
        </div>
      </nav>
      <main className="flex-1 flex gap-8 px-8 py-8">
        <section className="flex-1">
          <h1 className="text-3xl font-bold mb-6 text-white">Join Group</h1>
          {/* Search & Filters */}
          <div className="card-dark rounded-xl shadow p-6 mb-6 flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="Search groups by name or keyword..."
              className="input-dark border border-[#4A5568] rounded px-3 py-2 text-sm flex-1 min-w-[220px]"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="input-dark border border-[#4A5568] rounded px-3 py-2 text-sm min-w-[140px]">
              <option>Category</option>
            </select>
            <select className="input-dark border border-[#4A5568] rounded px-3 py-2 text-sm min-w-[120px]">
              <option>Members</option>
            </select>
            <select className="input-dark border border-[#4A5568] rounded px-3 py-2 text-sm min-w-[120px]">
              <option>Sort By</option>
            </select>
            <button className="border border-[#4A5568] rounded px-4 py-2 font-semibold text-sm text-white hover:bg-[#2D3748] transition-colors">Clear Filters</button>
          </div>
          {/* Group Cards Grid */}
          <div className="mb-8">
            <h2 className="font-semibold text-lg mb-4 text-white">Explore & Join Groups</h2>
            <div className="grid grid-cols-3 gap-6">
              {groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase())).map((g, i) => (
                <div key={i} className="card-dark rounded-xl shadow p-6 flex flex-col gap-2">
                  <div className="font-bold text-lg mb-1 text-white">{g.name}</div>
                  <div className="text-[#A0AEC0] text-xs mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#4A5568]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-5a4 4 0 11-8 0 4 4 0 018 0zm6 4v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5a2 2 0 012-2h12a2 2 0 012 2z" /></svg>
                    {g.members.toLocaleString()} Members
                  </div>
                  <div className="text-[#E0E0E0] text-sm mb-2">{g.desc}</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {g.tags.map((tag, j) => (
                      <span key={j} className="bg-[#2D3748] text-[#E0E0E0] px-2 py-1 rounded text-xs font-medium border border-[#4A5568]">{tag}</span>
                    ))}
                  </div>
                  <button className="btn-gradient-primary rounded px-4 py-2 font-semibold text-sm w-fit">Join Group</button>
                  <div className="text-xs text-[#A0AEC0] mt-2">{g.note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* Right Sidebar */}
        <aside className="w-96 flex flex-col gap-8">
          <div className="card-dark rounded-xl shadow p-6 mb-2">
            <h3 className="font-semibold mb-4 text-white">My Groups</h3>
            <div className="flex flex-col gap-3">
              {myGroups.map((g, i) => (
                <div key={i} className="border-b border-[#4A5568] pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0">
                  <div className="font-semibold text-white">{g.name}</div>
                  <div className="text-xs text-[#A0AEC0] mb-2">{g.note}</div>
                  <div className="flex gap-2">
                    <button className="border border-[#4A5568] rounded px-3 py-1 text-xs font-semibold text-white hover:bg-[#2D3748] transition-colors">View Details</button>
                    <button className="border border-red-500 rounded px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-900 transition-colors">Leave</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card-dark rounded-xl shadow p-6 mb-2">
            <h3 className="font-semibold mb-4 text-white">Trending Groups</h3>
            <ul className="flex flex-col gap-2">
              {trendingGroups.map((g, i) => (
                <li key={i} className="flex justify-between items-center text-sm">
                  <span className="text-white">{g.name}</span>
                  <span className="text-[#A0AEC0]">{g.members}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>
      {/* Footer */}
      <footer className="mt-12 text-center text-[#A0AEC0] text-sm pb-4">
        <div>© 2023 CommunityHub. All rights reserved.</div>
      </footer>
    </div>
  );
}
