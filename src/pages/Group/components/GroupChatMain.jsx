import React from "react";

const GroupChatMain = ({
  currentGroup,
  onlineUsers,
  messages,
  user,
  input,
  sending,
  typingUsers,
  chatRef,
  onInputChange,
  onSendMessage,
  formatTime,
  groupMessages,
  onNavigateToDetails
}) => {
  const groupedMessages = groupMessages(messages);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-white">
      {/* Enhanced Chat Header */}
      <div className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-200 px-8 py-6 flex items-center justify-between flex-shrink-0 shadow-sm" style={{ minHeight: '76px' }}>
        <div className="flex items-center gap-6">
          {/* Group Picture */}
          <div className="flex-shrink-0">
            {currentGroup?.image ? (
              <img
                src={currentGroup.image}
                alt={currentGroup.name}
                className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-lg ring-2 ring-blue-100"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center border-2 border-white shadow-lg ring-2 ring-blue-100">
                <span className="text-white text-xl font-bold">
                  {currentGroup?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
          
          {/* Group Info */}
          <button
            onClick={onNavigateToDetails}
            className="hover:bg-white/80 p-3 rounded-xl transition-all duration-200 hover:shadow-sm text-left flex-1"
          >
            <h1 className="font-bold text-2xl text-gray-800">{currentGroup?.name || 'Loading...'}</h1>
            <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
              <span>Click to view details</span>
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                {onlineUsers.length} online
              </span>
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
              <span>{currentGroup?.memberCount || 0} total members</span>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-4">
          {/* Enhanced Online users indicators */}
          <div className="flex -space-x-3">
            {onlineUsers.slice(0, 6).map((member) => (
              <div key={member.id} className="relative">
                <img
                  src={member.userAvatar}
                  alt={member.userName}
                  className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm"
                  title={`${member.userName} - online`}
                />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
            ))}
            {onlineUsers.length > 6 && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm">
                +{onlineUsers.length - 6}
              </div>
            )}
          </div>
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


    </div>
  );
};

export default GroupChatMain;