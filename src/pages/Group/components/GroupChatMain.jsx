import React from "react";

const GroupChatMain = ({
  currentGroup,
  onlineUsers,
  messages,
  user,
  input,
  sending,
  typingUsers,
  showGroupDetails,
  chatRef,
  onShowGroupDetails,
  onInputChange,
  onSendMessage,
  formatTime,
  groupMessages
}) => {
  const groupedMessages = groupMessages(messages);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Chat Header - Fixed - Matches sidebar heights */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ minHeight: '76px' }}>
        <div>
          <button
            onClick={() => onShowGroupDetails(!showGroupDetails)}
            className="hover:bg-gray-100 p-2 rounded transition-colors"
          >
            <h1 className="font-bold text-xl text-left">{currentGroup?.name || 'Loading...'}</h1>
            <div className="text-xs text-gray-500 text-left">
              Click to view group details • {onlineUsers.length} online • {currentGroup?.memberCount || 0} total
            </div>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Online users indicators */}
          <div className="flex -space-x-2">
            {onlineUsers.slice(0, 5).map((member) => (
              <img
                key={member.id}
                src={member.userAvatar}
                alt={member.userName}
                className="w-8 h-8 rounded-full border-2 border-white object-cover"
                title={`${member.userName} - online`}
              />
            ))}
            {onlineUsers.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium">
                +{onlineUsers.length - 5}
              </div>
            )}
          </div>
          <button className="border rounded px-3 py-1 text-sm font-semibold hover:bg-gray-100">
            Invite Members
          </button>
        </div>
      </div>

      {/* Chat Messages Area - Scrollable */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
          ref={chatRef}
        >
          {groupedMessages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Welcome to {currentGroup?.name}!</h3>
              <p className="text-gray-500">Start the conversation by sending the first message.</p>
            </div>
          ) : (
            groupedMessages.map((messageGroup) => (
              <div key={messageGroup.messages[0].id} className="flex gap-3">
                <img
                  src={messageGroup.userAvatar}
                  alt={messageGroup.userName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{messageGroup.userName}</span>
                    <span className="text-xs text-gray-500">
                      {formatTime(messageGroup.timestamp)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {messageGroup.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`rounded-lg px-4 py-2 text-sm break-words ${
                          message.userId === user?.id
                            ? "bg-blue-500 text-white ml-auto max-w-lg"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {message.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Typing Indicator - Fixed above input */}
        {typingUsers.length > 0 && (
          <div className="px-6 py-2 bg-white border-t border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span>
                {typingUsers.length === 1
                  ? `${typingUsers[0].userName} is typing...`
                  : `${typingUsers.length} people are typing...`
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Message Input - Fixed at bottom */}
      <form className="bg-white border-t px-6 py-4 flex items-center gap-2 flex-shrink-0" onSubmit={onSendMessage}>
        <input
          type="text"
          className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          placeholder="Type your message here..."
          value={input}
          onChange={onInputChange}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? 'Sending...' : 'Send Message'}
        </button>
      </form>

      {/* Group Details Modal */}
      {showGroupDetails && currentGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Group Details</h2>
              <button
                onClick={() => onShowGroupDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Group Info */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2">{currentGroup.name}</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Description:</strong> {currentGroup.description}</div>
                <div><strong>Category:</strong> {currentGroup.category}</div>
                <div><strong>Members:</strong> {currentGroup.memberCount}</div>
                <div><strong>Created:</strong> {currentGroup.createdAt?.toLocaleDateString()}</div>
                <div><strong>Type:</strong> {currentGroup.isPublic ? 'Public' : 'Private'}</div>
                <div><strong>Created by:</strong> {currentGroup.createdByName}</div>
              </div>
            </div>

            {/* Online Members */}
            <div>
              <h3 className="font-semibold mb-3">Online Members ({onlineUsers.length})</h3>
              {onlineUsers.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {onlineUsers.map((member) => (
                    <li key={member.id} className="flex items-center gap-3 text-sm p-2 rounded hover:bg-gray-50">
                      <img src={member.userAvatar} alt={member.userName} className="w-8 h-8 rounded-full object-cover" />
                      <span className="flex-1">{member.userName}</span>
                      <span className="w-2 h-2 bg-green-500 rounded-full" title="Online"></span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No members online right now</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChatMain;