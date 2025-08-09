import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function HelpSupport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      question: "How do I create a new account?",
      answer: "To create a new account, click on the 'Sign Up' button located in the top right corner of the homepage. You will then be guided through a simple registration process where you can provide your details and set up your profile."
    },
    {
      id: 2,
      question: "How do I join a group?",
      answer: "You can join groups by browsing the suggested groups on your dashboard or by visiting the Groups page. Simply click the 'Join Group' button next to any group you're interested in."
    },
    {
      id: 3,
      question: "How do I schedule a learning session?",
      answer: "Navigate to the 'Teach & Learn' section from your dashboard. You can browse available teachers, select a time slot that works for you, and book a 1-on-1 learning session."
    },
    {
      id: 4,
      question: "How do I create a group request?",
      answer: "Go to the 'Requests' section and click on 'Create Group Request'. Fill in the details about what you're looking for and submit your request for others to see and respond to."
    },
    {
      id: 5,
      question: "How do I connect with other users?",
      answer: "You can connect with other users by visiting their profiles and clicking the 'Connect' button. You can find users through groups, activities, or by browsing the network."
    },
    {
      id: 6,
      question: "How do I update my profile?",
      answer: "Click on your profile picture or go to Settings to update your profile information, including your bio, skills, interests, and profile picture."
    },
    {
      id: 7,
      question: "What should I do if I forgot my password?",
      answer: "On the login page, click 'Forgot Password' and enter your email address. You'll receive instructions to reset your password via email."
    },
    {
      id: 8,
      question: "How do I leave a group?",
      answer: "Go to your Groups page, find the group you want to leave, and click on the group settings or options menu to find the 'Leave Group' option."
    }
  ];

  const supportCategories = [
    {
      icon: "👤",
      title: "Account & Profile",
      description: "Get help with account creation, profile setup, and account management.",
      topics: ["Account creation", "Profile setup", "Password reset", "Account security"]
    },
    {
      icon: "👥",
      title: "Groups & Communities",
      description: "Learn about joining groups, creating communities, and group management.",
      topics: ["Joining groups", "Creating groups", "Group moderation", "Group settings"]
    },
    {
      icon: "📚",
      title: "Learning & Sessions",
      description: "Everything about scheduling sessions, finding teachers, and learning opportunities.",
      topics: ["Booking sessions", "Finding teachers", "Session management", "Payment issues"]
    },
    {
      icon: "🤝",
      title: "Connections & Networking",
      description: "Help with making connections, networking, and professional relationships.",
      topics: ["Making connections", "Networking tips", "Professional etiquette", "Communication"]
    }
  ];

  const contactMethods = [
    {
      icon: "📧",
      title: "Email Support",
      description: "Get in touch via email for detailed assistance",
      contact: "support@skillnet.com",
      responseTime: "24-48 hours"
    },
    {
      icon: "💬",
      title: "Live Chat",
      description: "Chat with our support team in real-time",
      contact: "Available 9 AM - 6 PM",
      responseTime: "Immediate"
    },
    {
      icon: "📞",
      title: "Phone Support",
      description: "Speak directly with a support representative",
      contact: "+1 (555) 123-4567",
      responseTime: "Business hours"
    }
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFaq = (faqId) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">How Can We Help?</h1>
          <p className="text-xl mb-8 text-blue-100">
            Our dedicated support team and comprehensive resources are here to assist you. 
            Find answers, learn new skills, and connect with our community.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for help articles, FAQs, or topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-6 py-4 text-gray-900 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <div className="absolute right-4 top-4 text-gray-400">
                🔍
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Support Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Browse Help Categories</h2>
            <p className="text-xl text-gray-600">Find the information you need by category</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {supportCategories.map((category, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-4xl mb-4">{category.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{category.title}</h3>
                <p className="text-gray-600 mb-4">{category.description}</p>
                <ul className="text-sm text-gray-500">
                  {category.topics.map((topic, topicIndex) => (
                    <li key={topicIndex} className="mb-1">• {topic}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Quick answers to common questions</p>
          </div>

          <div className="space-y-4">
            {filteredFaqs.map((faq) => (
              <div key={faq.id} className="bg-white rounded-lg shadow-sm border">
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  <span className="text-2xl text-gray-400">
                    {expandedFaq === faq.id ? '−' : '+'}
                  </span>
                </button>
                {expandedFaq === faq.id && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredFaqs.length === 0 && searchTerm && (
            <div className="text-center py-8">
              <p className="text-gray-500">No FAQs found matching your search. Try different keywords or contact support.</p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Still Need Help?</h2>
            <p className="text-xl text-gray-600">Our support team is here to assist you</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {contactMethods.map((method, index) => (
              <div key={index} className="text-center p-6 bg-gray-50 rounded-xl">
                <div className="text-4xl mb-4">{method.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{method.title}</h3>
                <p className="text-gray-600 mb-4">{method.description}</p>
                <div className="font-semibold text-blue-600 mb-2">{method.contact}</div>
                <div className="text-sm text-gray-500">Response time: {method.responseTime}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Additional Resources</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Link 
              to="/community-guidelines" 
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-3">📋 Community Guidelines</h3>
              <p className="text-gray-600">Learn about our community standards and best practices</p>
            </Link>
            
            <Link 
              to="/privacy-policy" 
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-3">🔒 Privacy Policy</h3>
              <p className="text-gray-600">Understand how we protect and use your data</p>
            </Link>
            
            <Link 
              to="/terms-of-service" 
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-3">📄 Terms of Service</h3>
              <p className="text-gray-600">Review our terms and conditions</p>
            </Link>
            
            <Link 
              to="/getting-started" 
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-3">🚀 Getting Started Guide</h3>
              <p className="text-gray-600">New to Skill-Net? Start here for a quick overview</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Back to Home */}
      <section className="py-8 bg-white border-t">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-100 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
        <span>© 2025 Skill-Net. All rights reserved.</span>
        <span className="flex items-center gap-1 text-xs">
          Made with <span className="text-blue-600 font-bold">Visily</span>
        </span>
      </footer>
    </div>
  );
}
