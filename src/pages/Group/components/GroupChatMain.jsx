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
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#0A0D14]">
      {/* Enhanced Chat Header */}
      <div className="bg-gradient-to-r from-[#0A0D14] to-[#1A202C] border-b border-[#2D3748] px-8 py-6 flex items-center justify-between flex-shrink-0 shadow-sm" style={{ minHeight: '76px' }}>
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
            className="hover:bg-[#2D3748]/80 p-3 rounded-xl transition-all duration-200 hover:shadow-sm text-left flex-1"
          >
            <h1 className="font-bold text-2xl text-white">{currentGroup?.name || 'Loading...'}</h1>
            <div className="text-sm text-[#A0AEC0] mt-1 flex items-center gap-2">
              <span>Click to view details</span>
              <span className="w-1 h-1 bg-[#4A5568] rounded-full"></span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                {onlineUsers.length} online
              </span>
              <span className="w-1 h-1 bg-[#4A5568] rounded-full"></span>
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
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0D14]">
        <div
          className="flex-1 overflow-y-auto px-8 py-6 space-y-4"
          ref={chatRef}
          style={{
            backgroundImage: 'url(/chatbackground.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            minHeight: '400px',
            width: '100%',
            height: '100%'
          }}
        >
          {groupedMessages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-blue-400 text-4xl mb-4 drop-shadow-lg">💬</div>
              <h3 className="text-lg font-semibold text-white mb-2 drop-shadow-lg">Welcome to {currentGroup?.name}!</h3>
              <p className="text-blue-200 drop-shadow-md">Start the conversation by sending the first message.</p>
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
                    <span className="font-semibold text-sm text-blue-200 drop-shadow-md">{messageGroup.userName}</span>
                    <span className="text-xs text-blue-300/80 drop-shadow-sm">
                      {formatTime(messageGroup.timestamp)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {messageGroup.messages.map((message) => {
                      // Calculate message width based on text length
                      const textLength = message.text.length;
                      let widthClass = '';
                      
                      if (textLength <= 20) {
                        widthClass = 'max-w-xs';
                      } else if (textLength <= 50) {
                        widthClass = 'max-w-sm';
                      } else if (textLength <= 100) {
                        widthClass = 'max-w-md';
                      } else if (textLength <= 200) {
                        widthClass = 'max-w-lg';
                      } else {
                        widthClass = 'max-w-2xl';
                      }
                      
                      return (
                        <div
                          key={message.id}
                          className={`rounded-lg px-4 py-2 text-sm break-words shadow-lg backdrop-blur-sm ${widthClass} ${
                            message.userId === user?.id
                              ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white ml-auto border border-blue-400/30"
                              : "bg-black/40 text-white border border-white/20 backdrop-blur-md"
                          }`}
                        >
                          {message.text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Typing Indicator - Fixed above input */}
        {typingUsers.length > 0 && (
          <div className="px-6 py-2 bg-[#0A0D14] border-t border-[#2D3748] flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-[#A0AEC0]">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#A0AEC0] rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-[#A0AEC0] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-[#A0AEC0] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
      <form className="bg-[#0A0D14] border-t border-[#2D3748] px-6 py-4 flex items-center gap-2 flex-shrink-0" onSubmit={onSendMessage}>
        <input
          type="text"
          className="flex-1 border border-[#2D3748] rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-[#1A202C] text-white placeholder-[#A0AEC0]"
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