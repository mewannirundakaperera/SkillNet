import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ChatIcon, GroupIcon, SearchIcon, DocumentIcon, MoneyIcon, LockIcon } from '@/components/Icons/SvgIcons';

const HelpAndSupport = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("faq");
  const [searchQuery, setSearchQuery] = useState("");

  const faqData = [
    {
      category: "Getting Started",
      questions: [
        {
          question: "How do I create my first request?",
          answer: "Navigate to the Requests section and click 'Create New Request'. Fill in the details about what you need help with, set your budget, and publish it for others to see."
        },
        {
          question: "How do I join a study group?",
          answer: "Browse available groups in the Groups section, find one that matches your interests, and click 'Join Group'. You may need to wait for approval from the group admin."
        },
        {
          question: "What is the difference between tutoring and study groups?",
          answer: "Tutoring is one-on-one help with a specific subject, while study groups are collaborative learning sessions with multiple participants working together on shared topics."
        }
      ]
    },
    {
      category: "Requests & Payments",
      questions: [
        {
          question: "How does the payment system work?",
          answer: "When you create a request, you set a budget. Once someone accepts your request and completes the work, the payment is processed through our secure payment gateway."
        },
        {
          question: "Can I cancel a request after it's been accepted?",
          answer: "You can cancel a request before work begins. If work has already started, you'll need to discuss cancellation terms with the person helping you."
        },
        {
          question: "What happens if I'm not satisfied with the help received?",
          answer: "Contact our support team immediately. We have a dispute resolution process to ensure fair outcomes for all parties involved."
        }
      ]
    },
    {
      category: "Account & Profile",
      questions: [
        {
          question: "How do I update my profile information?",
          answer: "Go to your Profile page and click the edit button. You can update your skills, interests, bio, and profile picture at any time."
        },
        {
          question: "Can I change my username?",
          answer: "Your username can be changed once every 30 days. Go to Settings > Profile to make this change."
        },
        {
          question: "How do I verify my account?",
          answer: "Account verification is automatic when you sign up with a valid email address. For additional verification, you can add a phone number in your profile settings."
        }
      ]
    },
    {
      category: "Groups & Collaboration",
      questions: [
        {
          question: "How do I create a study group?",
          answer: "Go to the Groups section and click 'Create Group'. Set your group name, description, and choose whether it's public or private."
        },
        {
          question: "Can I invite friends to my group?",
          answer: "Yes! You can invite friends by sharing your group link or by searching for their usernames and sending them an invitation."
        },
        {
          question: "What are the group size limits?",
          answer: "Free groups can have up to 20 members. Premium groups can accommodate up to 100 members for enhanced collaboration features."
        }
      ]
    }
  ];

  const contactMethods = [
    {
      title: "Email Support",
      description: "Get detailed help via email",
      icon: "📧",
      action: "support@skillnet.com",
      type: "email"
    },
    {
      title: "Live Chat",
      description: "Chat with our support team",
      icon: "💬",
      action: "Start Chat",
      type: "chat"
    },
    {
      title: "Phone Support",
      description: "Call us directly",
      icon: "📞",
      action: "+1 (555) 123-4567",
      type: "phone"
    },
    {
      title: "Community Forum",
      description: "Get help from other users",
      icon: "👥",
      action: "Visit Forum",
      type: "forum"
    }
  ];

  const filteredFAQ = faqData.map(category => ({
    ...category,
    questions: category.questions.filter(q =>
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const handleContactAction = (method) => {
    switch (method.type) {
      case "email":
        window.location.href = `mailto:${method.action}`;
        break;
      case "chat":
        // Implement live chat functionality
        alert("Live chat feature coming soon!");
        break;
      case "phone":
        window.location.href = `tel:${method.action}`;
        break;
      case "forum":
        // Navigate to forum
        alert("Community forum coming soon!");
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white">
      {/* Header */}
      <div className="bg-[#1A202C] border-b border-[#2D3748] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Help & Support Center
            </h1>
            <p className="text-xl text-[#A0AEC0] max-w-3xl mx-auto">
              Find answers to common questions, get help with your account, and connect with our support team
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search for help topics, questions, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 pl-12 bg-[#1A202C] border border-[#2D3748] rounded-lg text-white placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-[#A0AEC0]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Quick Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {contactMethods.map((method, index) => (
            <div
              key={index}
              className="bg-[#1A202C] border border-[#2D3748] rounded-lg p-6 hover:border-[#4299E1] transition-colors cursor-pointer"
              onClick={() => handleContactAction(method)}
            >
              <div className="text-4xl mb-4">{method.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{method.title}</h3>
              <p className="text-[#A0AEC0] text-sm mb-4">{method.description}</p>
              <button className="text-[#4299E1] hover:text-[#00BFFF] transition-colors font-medium">
                {method.action}
              </button>
            </div>
          ))}
        </div>

        {/* Main Content Tabs */}
        <div className="bg-[#1A202C] border border-[#2D3748] rounded-lg overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-[#2D3748]">
            <button
              onClick={() => setActiveTab("faq")}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === "faq"
                  ? "text-[#4299E1] border-b-2 border-[#4299E1] bg-[#2D3748]"
                  : "text-[#A0AEC0] hover:text-white hover:bg-[#2D3748]"
              }`}
            >
              Frequently Asked Questions
            </button>
            <button
              onClick={() => setActiveTab("guides")}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === "guides"
                  ? "text-[#4299E1] border-b-2 border-[#4299E1] bg-[#2D3748]"
                  : "text-[#A0AEC0] hover:text-white hover:bg-[#2D3748]"
              }`}
            >
              User Guides
            </button>
            <button
              onClick={() => setActiveTab("troubleshooting")}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === "troubleshooting"
                  ? "text-[#4299E1] border-b-2 border-[#4299E1] bg-[#2D3748]"
                  : "text-[#A0AEC0] hover:text-white hover:bg-[#2D3748]"
              }`}
            >
              Troubleshooting
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "faq" && (
              <div className="space-y-8">
                {filteredFAQ.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="border-b border-[#2D3748] pb-6 last:border-b-0">
                    <h3 className="text-xl font-semibold text-white mb-4">{category.category}</h3>
                    <div className="space-y-4">
                      {category.questions.map((item, questionIndex) => (
                        <div key={questionIndex} className="bg-[#2D3748] border border-[#4A5568] rounded-lg p-4">
                          <h4 className="font-medium text-white mb-2">{item.question}</h4>
                          <p className="text-[#A0AEC0] text-sm leading-relaxed">{item.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {searchQuery && filteredFAQ.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">
                      <SearchIcon className="w-16 h-16 mx-auto text-blue-500" />
                    </div>
                    <p className="text-[#A0AEC0] text-lg">No results found for "{searchQuery}"</p>
                    <p className="text-[#718096] text-sm mt-2">Try different keywords or browse our categories</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "guides" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#2D3748] border border-[#4A5568] rounded-lg p-6">
                    <div className="text-3xl mb-4">
                      <DocumentIcon className="w-12 h-12 mx-auto text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Creating Requests</h3>
                    <p className="text-[#A0AEC0] text-sm mb-4">
                      Learn how to create effective requests that get responses quickly.
                    </p>
                    <Link to="/requests/create" className="text-[#4299E1] hover:text-[#00BFFF] text-sm font-medium">
                      Read Guide →
                    </Link>
                  </div>

                  <div className="bg-[#2D3748] border border-[#4A5568] rounded-lg p-6">
                    <div className="text-3xl mb-4">
                      <GroupIcon className="w-12 h-12 mx-auto text-purple-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Managing Groups</h3>
                    <p className="text-[#A0AEC0] text-sm mb-4">
                      Everything you need to know about creating and managing study groups.
                    </p>
                    <Link to="/groups" className="text-[#4299E1] hover:text-[#00BFFF] text-sm font-medium">
                      Read Guide →
                    </Link>
                  </div>

                  <div className="bg-[#2D3748] border border-[#4A5568] rounded-lg p-6">
                    <div className="text-3xl mb-4">
                      <MoneyIcon className="w-12 h-12 mx-auto text-yellow-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Payment & Billing</h3>
                    <p className="text-[#A0AEC0] text-sm mb-4">
                      Understanding our payment system and billing procedures.
                    </p>
                    <button className="text-[#4299E1] hover:text-[#00BFFF] text-sm font-medium">
                      Read Guide →
                    </button>
                  </div>

                  <div className="bg-[#2D3748] border border-[#4A5568] rounded-lg p-6">
                    <div className="text-3xl mb-4">
                      <LockIcon className="w-12 h-12 mx-auto text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Privacy & Security</h3>
                    <p className="text-[#A0AEC0] text-sm mb-4">
                      How we protect your data and maintain your privacy.
                    </p>
                    <button className="text-[#4299E1] hover:text-[#00BFFF] text-sm font-medium">
                      Read Guide →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "troubleshooting" && (
              <div className="space-y-6">
                <div className="bg-[#2D3748] border border-[#4A5568] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Common Issues & Solutions</h3>
                  <div className="space-y-4">
                    <div className="border-l-4 border-[#4299E1] pl-4">
                      <h4 className="font-medium text-white mb-2">Can't log in to your account?</h4>
                      <p className="text-[#A0AEC0] text-sm mb-2">
                        Try resetting your password or check if your email is verified.
                      </p>
                      <button className="text-[#4299E1] hover:text-[#00BFFF] text-sm font-medium">
                        Reset Password →
                      </button>
                    </div>

                    <div className="border-l-4 border-green-400 pl-4">
                      <h4 className="font-medium text-white mb-2">Request not showing up?</h4>
                      <p className="text-[#A0AEC0] text-sm mb-2">
                        Check if your request was saved as a draft or if it needs approval.
                      </p>
                      <Link to="/requests/my-requests" className="text-[#4299E1] hover:text-[#00BFFF] text-sm font-medium">
                        Check My Requests →
                      </Link>
                    </div>

                    <div className="border-l-4 border-yellow-400 pl-4">
                      <h4 className="font-medium text-white mb-2">Payment not processing?</h4>
                      <p className="text-[#A0AEC0] text-sm mb-2">
                        Verify your payment method and check for any error messages.
                      </p>
                      <button className="text-[#4299E1] hover:text-[#00BFFF] text-sm font-medium">
                        Contact Support →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2D3748] border border-[#4A5568] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Still Need Help?</h3>
                  <p className="text-[#A0AEC0] text-sm mb-4">
                    If you couldn't find the answer you're looking for, our support team is here to help.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button className="px-4 py-2 bg-[#4299E1] text-white rounded-lg hover:bg-[#3182CE] transition-colors">
                      Contact Support
                    </button>
                    <button className="px-4 py-2 border border-[#4299E1] text-[#4299E1] rounded-lg hover:bg-[#4299E1] hover:text-white transition-colors">
                      Schedule a Call
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Resources */}
        <div className="mt-12 bg-gradient-to-r from-[#1A202C] to-[#2D3748] border border-[#4299E1] rounded-lg p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Need More Help?</h2>
            <p className="text-[#A0AEC0] mb-6 max-w-2xl mx-auto">
              Our support team is available 24/7 to help you with any questions or issues you might have.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-6 py-3 bg-[#4299E1] text-white rounded-lg hover:bg-[#3182CE] transition-colors font-medium">
                Get Live Help
              </button>
              <Link
                to="/"
                className="px-6 py-3 border border-[#4299E1] text-[#4299E1] rounded-lg hover:bg-[#4299E1] hover:text-white transition-colors font-medium"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpAndSupport;
