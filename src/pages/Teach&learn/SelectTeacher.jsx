import React, { useState } from "react";
import { Link } from "react-router-dom";
import TeachandLearnNavbar from "../../components/Navbars/TeachandLearnNavbar";


const teachers = [
  {
    name: "Dr. Evelyn Reed",
    subject: "Advanced Physics",
    rating: 4.9,
    reviews: 1985,
    price: 75,
    desc: "Dr. Reed brings complex physics concepts to life with interactive lessons and real-world applications. Her passion for teaching inspires students to excel.",
    avatar: "https://randomuser.me/api/portraits/women/32.jpg",
  },
  {
    name: "Prof. Marcus Thorne",
    subject: "Calculus & Algebra",
    rating: 4.8,
    reviews: 1210,
    price: 60,
    desc: "A dedicated mathematics professor known for simplifying intricate equations. Prof. Thorne excels at building strong mathematical foundations.",
    avatar: "https://randomuser.me/api/portraits/men/33.jpg",
  },
  {
    name: "Ms. Chloe Kim",
    subject: "Creative Writing",
    rating: 4.7,
    reviews: 750,
    price: 50,
    desc: "Ms. Kim fosters a vibrant environment for aspiring writers, guiding them through storytelling, poetry, and essay composition.",
    avatar: "https://randomuser.me/api/portraits/women/34.jpg",
  },
  {
    name: "Mr. Alex Chen",
    subject: "Computer Science",
    rating: 4.9,
    reviews: 1230,
    price: 80,
    desc: "An expert in programming and algorithms, Mr. Chen makes coding accessible and exciting for all skill levels, from beginners to pros.",
    avatar: "https://randomuser.me/api/portraits/men/35.jpg",
  },
  {
    name: "Dr. Sophia Ramirez",
    subject: "Organic Chemistry",
    rating: 4.8,
    reviews: 1185,
    price: 70,
    desc: "Dr. Ramirez illuminates the complexities of organic chemistry through clear explanations and practical examples.",
    avatar: "https://randomuser.me/api/portraits/women/36.jpg",
  },
  {
    name: "Coach Ben Carter",
    subject: "Debate & Public Speaking",
    rating: 4.6,
    reviews: 120,
    price: 55,
    desc: "Coach Carter empowers students to articulate their thoughts confidently and persuasively. He provides excellent mentorship.",
    avatar: "https://randomuser.me/api/portraits/men/37.jpg",
  },
  {
    name: "Madame Isabelle Dubois",
    subject: "French Language",
    rating: 4.9,
    reviews: 170,
    price: 65,
    desc: "Madame Dubois offers immersive French lessons, focusing on conversational fluency and cultural understanding. Parlez-vous français?",
    avatar: "https://randomuser.me/api/portraits/women/38.jpg",
  },
  {
    name: "Sensei Hiroki Tanaka",
    subject: "Japanese Culture & Language",
    rating: 4.7,
    reviews: 110,
    price: 60,
    desc: "Sensei Tanaka provides an authentic journey into Japanese language and traditions, from calligraphy to polite conversation.",
    avatar: "https://randomuser.me/api/portraits/men/39.jpg",
  },
];

const subjects = [
  "Mathematics", "Physics", "Chemistry", "Biology", "English Literature", "Creative Writing", "Computer Science", "History", "Economics", "French", "Japanese", "Debate"
];

export default function SelectTeacher() {
  const [search, setSearch] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [rate, setRate] = useState([20, 100]);

  const handleSubject = (subj) => {
    setSelectedSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
  };

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase());
    const matchesSubject =
      selectedSubjects.length === 0 || selectedSubjects.includes(t.subject.split(" ")[0]);
    const matchesRate = t.price >= rate[0] && t.price <= rate[1];
    return matchesSearch && matchesSubject && matchesRate;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b flex items-center justify-between px-8 py-3">
        <div className="flex items-center gap-2">
          <Link to= "/">
          <span className="font-bold text-lg text-indigo-700">Student Scheduler</span>
          </Link>
        </div>
        <ul className="flex gap-6 text-gray-700 font-medium">
          <li><Link to="/SelectTeacher" className="hover:text-indigo-600">Select Teacher</Link></li>
          <li><Link to="/TimeSlotSelection" className="hover:text-indigo-600">Time Slot Selection</Link></li>
          <li><Link to="/PaymentPage" className="hover:text-indigo-600">Payment</Link></li>
          <li><Link to="/OnlineMeeting" className="hover:text-indigo-600">Online Meeting</Link></li>
        </ul>
        <div className="flex items-center gap-4">
          <img src="https://randomuser.me/api/portraits/men/40.jpg" alt="User" className="h-8 w-8 rounded-full" />
        </div>
      </nav>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-10 flex flex-col items-center text-center">
        <img src="https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=facearea&w=96&h=96" alt="Hero" className="w-20 h-20 rounded-full object-cover mb-4" />
        <h1 className="text-3xl font-bold mb-2">Discover Your Perfect Teacher</h1>
        <p className="text-gray-500 max-w-2xl">Browse through our highly-rated instructors, each specializing in various subjects. Use our filters to find the best fit for your learning needs and embark on a personalized educational journey.</p>
      </section>
      <div className="flex flex-1 gap-8 px-8 pb-12">
        {/* Filter Sidebar */}
        <aside className="w-72 bg-white rounded-xl shadow p-6 h-fit mt-[-60px]">
          <h2 className="font-semibold mb-4">Filter Teachers</h2>
          <input
            type="text"
            placeholder="Search by name or subject..."
            className="border rounded px-3 py-2 text-sm w-full mb-4"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="mb-4">
            <div className="font-semibold text-xs mb-2">Subjects</div>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
              {subjects.map((s, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedSubjects.includes(s)}
                    onChange={() => handleSubject(s)}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <div className="font-semibold text-xs mb-2">Hourly Rate</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">${rate[0]}</span>
              <input
                type="range"
                min={20}
                max={100}
                value={rate[0]}
                onChange={e => setRate([+e.target.value, rate[1]])}
                className="flex-1"
              />
              <input
                type="range"
                min={20}
                max={100}
                value={rate[1]}
                onChange={e => setRate([rate[0], +e.target.value])}
                className="flex-1"
              />
              <span className="text-xs text-gray-500">${rate[1]}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="bg-blue-600 text-white rounded px-4 py-2 font-semibold text-sm flex-1">Apply Filters</button>
            <button className="border rounded px-4 py-2 font-semibold text-sm flex-1" onClick={() => { setSearch(""); setSelectedSubjects([]); setRate([20, 100]); }}>Clear Filters</button>
          </div>
        </aside>
        {/* Teacher Cards Grid */}
        <main className="flex-1 grid grid-cols-3 gap-8">
          {filteredTeachers.map((t, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
              <img src={t.avatar} alt={t.name} className="w-20 h-20 rounded-full object-cover mb-2" />
              <div className="font-bold text-lg mb-1">{t.name}</div>
              <div className="text-blue-600 text-xs font-semibold mb-1">{t.subject}</div>
              <div className="flex items-center justify-center gap-1 text-yellow-500 text-sm mb-1">
                <span>★</span>
                <span>{t.rating}</span>
                <span className="text-gray-400">({t.reviews} Reviews)</span>
              </div>
              <div className="text-gray-500 text-sm mb-2">{t.desc}</div>
              <div className="font-bold text-blue-600 text-lg mb-2">${t.price} <span className="text-sm font-normal text-gray-400">/hour</span></div>
              <div className="flex gap-2 w-full">
                <button className="border rounded px-4 py-2 font-semibold text-sm flex-1 hover:bg-gray-100">View Profile</button>
                <button className="bg-blue-600 text-white rounded px-4 py-2 font-semibold text-sm flex-1 hover:bg-blue-700">Select Teacher</button>
              </div>
            </div>
          ))}
        </main>
      </div>
      {/* Footer */}
      <footer className="mt-12 text-center text-gray-400 text-sm pb-4">
        <div>Student Scheduler</div>
        <div className="mt-2">© 2024 Student Scheduler.</div>
      </footer>
    </div>
  );
}
