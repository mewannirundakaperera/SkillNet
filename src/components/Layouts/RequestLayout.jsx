import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import IntelligentNavbar from "@components/Navigation/IntelligentNavbar.jsx";

// Simple Layout Component (basic navbar + content)
export function SimpleLayout({ children }) {
  return (
      <div className="min-h-screen bg-gray-50">
        <IntelligentNavbar />
        <main className="pt-4">
          {children}
        </main>
      </div>
  );
}

// Full Width Layout Component (navbar + full width content)
export function FullWidthLayout({ children }) {
  return (
      <div className="min-h-screen bg-gray-50">
        <IntelligentNavbar />
        <main className="w-full">
          {children}
        </main>
      </div>
  );
}

// Profile Layout Component (navbar + content with profile styling)
export function ProfileLayout({ children }) {
  return (
      <div className="min-h-screen bg-gray-50">
        <IntelligentNavbar />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          {children}
        </main>
      </div>
  );
}

// Request Layout with Expandable Sidebar Navigation
export default function RequestLayout({ children, title, subtitle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [createRequestsExpanded, setCreateRequestsExpanded] = useState(false);
  const [receivedRequestsExpanded, setReceivedRequestsExpanded] = useState(false);

  // Main sidebar navigation items
  const sidebarNavItems = [
    { to: "/StudentConnect", label: "Dashboard", icon: "📊", type: "link" },
    {
      to: "/requests/create",
      label: "Create Requests",
      icon: "➕",
      type: "expandable",
      expanded: createRequestsExpanded,
      setExpanded: setCreateRequestsExpanded,
      subItems: [
        { to: "/requests/create", label: "One-to-One Request", active: true },
        { to: "/group/create-group-request", label: "Group Request" },
        { to: "/requests/my-requests", label: "My Requests" },
        { to: "/requests/draft", label: "Draft Requests" },
        { to: "/requests/active", label: "Active Requests" },
        { to: "/requests/completed", label: "Completed" }
      ]
    },
    {
      to: "/OneToOneRequests",
      label: "Received Requests",
      icon: "💬",
      type: "expandable",
      expanded: receivedRequestsExpanded,
      setExpanded: setReceivedRequestsExpanded,
      subItems: [
        { to: "/OneToOneRequests", label: "One-to-One", active: true },
        { to: "/groups/requests", label: "Group Requests" },
        { to: "/OneToOneRequests/pending", label: "Pending Offers" },
        { to: "/OneToOneRequests/accepted", label: "Accepted" },
        { to: "/OneToOneRequests/archived", label: "Archived" }
      ]
    },
    { to: "/RequestHistory", label: "Request History", icon: "📋", type: "link" },
  ];

  // ✅ FIXED: Include all create request paths including draft, active, and completed
  const isCreateRequestPath = location.pathname.startsWith('/requests/create') ||
      location.pathname.startsWith('/requests/create-group') ||
      location.pathname.startsWith('/requests/my-requests') ||
      location.pathname.startsWith('/requests/draft') ||
      location.pathname.startsWith('/requests/active') ||
      location.pathname.startsWith('/requests/completed');

  // Check if current path matches any received requests paths
  const isReceivedRequestPath = location.pathname.startsWith('/OneToOneRequests') ||
      location.pathname.startsWith('/requests/group-received');

  // Auto-expand if we're on relevant pages
  React.useEffect(() => {
    if (isCreateRequestPath && !createRequestsExpanded) {
      setCreateRequestsExpanded(true);
    }
    if (isReceivedRequestPath && !receivedRequestsExpanded) {
      setReceivedRequestsExpanded(true);
    }
  }, [location.pathname, isCreateRequestPath, isReceivedRequestPath, createRequestsExpanded, receivedRequestsExpanded]);

  // Close all expanded sections when navigating to dashboard
  React.useEffect(() => {
    if (location.pathname === '/StudentConnect') {
      setCreateRequestsExpanded(false);
      setReceivedRequestsExpanded(false);
    }
  }, [location.pathname]);

  // ✅ ENHANCED: Get active sidebar link styling with better path matching
  const getSidebarLinkClass = (path, isSubItem = false) => {
    const baseClass = `flex items-center gap-3 px-4 py-2 rounded-lg font-medium text-left transition-colors ${
        isSubItem ? 'ml-6 pl-8 text-sm' : ''
    }`;

    // More precise active state checking
    const isActive = location.pathname === path ||
        (path === '/requests/create' && location.pathname === '/requests/create') ||
        (path === '/requests/create-group' && location.pathname.startsWith('/requests/create-group')) ||
        (path === '/requests/my-requests' && location.pathname.startsWith('/requests/my-requests')) ||
        (path === '/requests/draft' && location.pathname.startsWith('/requests/draft')) ||
        (path === '/requests/active' && location.pathname.startsWith('/requests/active')) ||
        (path === '/requests/completed' && location.pathname.startsWith('/requests/completed')) ||
        (path === '/OneToOneRequests' && location.pathname === '/OneToOneRequests') ||
        (path === '/requests/group-received' && location.pathname.startsWith('/requests/group-received')) ||
        (path === '/OneToOneRequests/pending' && location.pathname.startsWith('/OneToOneRequests/pending')) ||
        (path === '/OneToOneRequests/accepted' && location.pathname.startsWith('/OneToOneRequests/accepted')) ||
        (path === '/OneToOneRequests/archived' && location.pathname.startsWith('/OneToOneRequests/archived'));

    return isActive
        ? `${baseClass} ${isSubItem ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600 font-semibold' : 'bg-blue-50 text-blue-600'}`
        : `${baseClass} text-gray-700 hover:bg-gray-100`;
  };

  // Handle expandable item click with smart close behavior
  const handleExpandableClick = (item) => {
    // If clicking the same section that's already expanded, collapse it and go to dashboard
    if (item.expanded) {
      item.setExpanded(false);
      // Navigate to dashboard when closing expanded section
      navigate('/StudentConnect');
    } else {
      // Close other sections first
      if (item.label === "Create Requests") {
        setReceivedRequestsExpanded(false);
      } else if (item.label === "Received Requests") {
        setCreateRequestsExpanded(false);
      }
      // Then expand the clicked section
      item.setExpanded(true);
    }
  };

  // Handle sub-item click - DO NOT close parent section automatically
  const handleSubItemClick = () => {
    // Remove the auto-close behavior to prevent navigation issues
    // The section will stay open for better UX
  };

  // ✅ SIMPLIFIED: Only close expanded sections on outside click, no auto-navigation
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        // Only close expanded sections, don't navigate
        if (createRequestsExpanded || receivedRequestsExpanded) {
          setCreateRequestsExpanded(false);
          setReceivedRequestsExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [createRequestsExpanded, receivedRequestsExpanded]);

  // Handle escape key to close expanded sections
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        if (createRequestsExpanded || receivedRequestsExpanded) {
          setCreateRequestsExpanded(false);
          setReceivedRequestsExpanded(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [createRequestsExpanded, receivedRequestsExpanded]);

  return (
      <div className="min-h-screen bg-gray-50">
        {/* Main Navbar */}
        <IntelligentNavbar />

        {/* Main Content Area */}
        <div className="flex">
          {/* Sidebar Navigation */}
          <aside
              ref={sidebarRef}
              className="w-[280px] bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] py-6 px-4 flex flex-col gap-2"
          >
            {/* Page Title */}
            {title && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <h1 className="font-bold text-lg text-gray-800">{title}</h1>
                  {subtitle && (
                      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                  )}
                </div>
            )}

            {/* Navigation Links */}
            <nav className="flex-1 flex flex-col gap-1">
              {sidebarNavItems.map((item) => (
                  <div key={item.to}>
                    {/* Main Navigation Item */}
                    {item.type === "expandable" ? (
                        <button
                            onClick={() => handleExpandableClick(item)}
                            className={`${getSidebarLinkClass(item.to)} w-full justify-between hover:bg-gray-50`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{item.icon}</span>
                            <span>{item.label}</span>
                          </div>
                          <svg
                              className={`w-4 h-4 transition-transform duration-200 ${
                                  item.expanded ? 'rotate-90' : 'rotate-0'
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                          >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                    ) : (
                        <Link
                            to={item.to}
                            className={getSidebarLinkClass(item.to)}
                            onClick={() => {
                              // Close all expanded sections when navigating to other pages
                              setCreateRequestsExpanded(false);
                              setReceivedRequestsExpanded(false);
                            }}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                    )}

                    {/* Sub-items for expandable items */}
                    {item.type === "expandable" && item.expanded && (
                        <div className="mt-1 space-y-1 bg-gray-50 rounded-lg p-2 border-l-2 border-blue-200">
                          {item.subItems.map((subItem) => (
                              <Link
                                  key={subItem.to}
                                  to={subItem.to}
                                  className={`${getSidebarLinkClass(subItem.to, true)} hover:bg-white`}
                                  onClick={() => handleSubItemClick()}
                              >
                                <span>{subItem.label}</span>
                              </Link>
                          ))}
                        </div>
                    )}
                  </div>
              ))}
            </nav>

            {/* Quick Close All Button */}
            {(createRequestsExpanded || receivedRequestsExpanded) && (
                <div className="mb-4 pt-2 border-t border-gray-100">
                  <button
                      onClick={() => {
                        setCreateRequestsExpanded(false);
                        setReceivedRequestsExpanded(false);
                        // Navigate to dashboard when using collapse all
                        navigate('/StudentConnect');
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <span>↑</span>
                    <span>Collapse All & Go to Dashboard</span>
                  </button>
                </div>
            )}

            {/* Bottom Actions */}
            <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-1">
              <Link
                  to="/help"
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm"
                  onClick={() => {
                    setCreateRequestsExpanded(false);
                    setReceivedRequestsExpanded(false);
                  }}
              >
                <span>❓</span>
                <span>Help & Support</span>
              </Link>
              <Link
                  to="/settings"
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm"
                  onClick={() => {
                    setCreateRequestsExpanded(false);
                    setReceivedRequestsExpanded(false);
                  }}
              >
                <span>⚙️</span>
                <span>Settings</span>
              </Link>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
  );
}