import React, { useState } from "react";
import { Link } from "react-router-dom";
import RequestDetailsPopup from "./RequestDetailsPopup";

const MyGroupsSidebar = ({
  userGroups,
  currentGroupId,
  isCurrentUserAdmin,
  groupRequests = []
}) => {
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showRequestPopup, setShowRequestPopup] = useState(false);

  const handleViewRequestDetails = (requestId) => {
    setSelectedRequestId(requestId);
    setShowRequestPopup(true);
  };

  const handleCloseRequestPopup = () => {
    setShowRequestPopup(false);
    setSelectedRequestId(null);
  };
  return (
    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-4rem)] shadow-lg">
      {/* Enhanced Header */}
      <div className="px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50" style={{ minHeight: '76px' }}>
        <div className="flex items-center justify-between h-full">
          <div>
            <h2 className="font-bold text-xl text-gray-800">My Groups</h2>
            <p className="text-sm text-gray-600 mt-1">{userGroups.length} active groups</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Enhanced Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-3">
          {userGroups.length > 0 ? (
            userGroups.map((g) => (
              <Link
                key={g.id}
                to={`/chat/${g.id}`}
                className={`group flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 ${
                  g.id === currentGroupId
                    ? "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 font-semibold shadow-md border border-blue-200"
                    : "hover:bg-gray-50 text-gray-700 hover:shadow-md border border-transparent hover:border-gray-200"
                }`}
              >
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  g.id === currentGroupId ? "bg-blue-500" : "bg-gray-400 group-hover:bg-blue-400"
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{g.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  g.id === currentGroupId ? "bg-blue-200" : "bg-gray-100 group-hover:bg-blue-100"
                }`}>
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-gray-700 font-medium mb-2">No groups yet</h3>
              <p className="text-gray-500 text-sm mb-4">Join or create groups to start connecting!</p>
            </div>
          )}
        </div>

        {/* Group Requests Section */}
        {currentGroupId && groupRequests.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Group Requests ({groupRequests.length})
              </h3>
            </div>
            <div className="space-y-2">
              {groupRequests.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {request.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        by {request.name} • {request.time}
                      </p>
                      {request.rate && (
                        <p className="text-xs text-green-600 font-medium mt-1">
                          Rs.{request.rate}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleViewRequestDetails(request.id)}
                      className="ml-2 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                  {request.message && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                      {request.message}
                    </p>
                  )}
                </div>
              ))}
              {groupRequests.length > 5 && (
                <Link
                  to="/requests/group"
                  className="block text-center text-blue-600 hover:text-blue-700 text-xs font-medium py-2"
                >
                  View all {groupRequests.length} requests →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Enhanced action section */}
        {userGroups.length === 0 && (
          <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 mb-4">Get started with groups</p>
              {isCurrentUserAdmin ? (
                <Link
                  to="/groups/create"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create First Group
                </Link>
              ) : (
                <Link
                  to="/groups"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Browse Groups
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Request Details Popup */}
      <RequestDetailsPopup
        requestId={selectedRequestId}
        isOpen={showRequestPopup}
        onClose={handleCloseRequestPopup}
      />
    </aside>
  );
};

export default MyGroupsSidebar;