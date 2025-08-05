import React from "react";
import { Link } from "react-router-dom";

const MyGroupsSidebar = ({
  userGroups,
  currentGroupId,
  isCurrentUserAdmin
}) => {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-4rem)]">
      {/* Fixed Header - Matches other components height */}
      <div className="px-4 py-4 border-b border-gray-200 bg-white" style={{ minHeight: '76px' }}>
        <div className="flex items-center h-full">
          <h2 className="font-semibold text-lg">My Groups</h2>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-1">
          {userGroups.length > 0 ? (
            userGroups.map((g) => (
              <Link
                key={g.id}
                to={`/chat/${g.id}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  g.id === currentGroupId
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                <span className="flex-1 text-left">{g.name}</span>
                <span className="text-xs text-gray-400 truncate max-w-[80px]">
                  {g.memberCount}
                </span>
              </Link>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              <p>No groups yet</p>
              <p>Join groups from the groups page!</p>
            </div>
          )}
        </div>

        {/* Show group creation link only when no groups */}
        {userGroups.length === 0 && (
          <div className="mt-4 text-center p-4 border border-dashed border-gray-300 rounded-lg">
            <p className="text-xs text-gray-500 mb-2">No groups found</p>
            {isCurrentUserAdmin ? (
              <Link
                to="/groups/create"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Create First Group →
              </Link>
            ) : (
              <Link
                to="/groups"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Browse Groups →
              </Link>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default MyGroupsSidebar;