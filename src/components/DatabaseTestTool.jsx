import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DatabaseTestTool from '@/utils/databaseTestTool';

const DatabaseTestToolComponent = () => {
    const { user } = useAuth();
    const [testTool] = useState(() => new DatabaseTestTool());
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState([]);
    const [summary, setSummary] = useState(null);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        if (user) {
            testTool.setCurrentUser(user);
        }
    }, [user, testTool]);

    const runFullTest = async () => {
        setIsRunning(true);
        setTestResults([]);
        setSummary(null);
        setShowResults(true);

        try {
            const result = await testTool.runFullTest();
            setTestResults(testTool.getResults());
            setSummary(result.summary);
        } catch (error) {
            console.error('Test failed:', error);
        } finally {
            setIsRunning(false);
        }
    };

    const runSpecificTest = async (testName) => {
        setIsRunning(true);
        setShowResults(true);

        try {
            let result;
            switch (testName) {
                case 'basicConnection':
                    result = await testTool.testBasicConnection();
                    break;
                case 'authentication':
                    result = testTool.testAuthentication();
                    break;
                case 'readRequests':
                    result = await testTool.testReadRequests();
                    break;
                case 'readRequestResponses':
                    result = await testTool.testReadRequestResponses();
                    break;
                case 'readHiddenRequests':
                    result = await testTool.testReadHiddenRequests();
                    break;
                case 'readUsers':
                    result = await testTool.testReadUsers();
                    break;
                case 'readUserProfiles':
                    result = await testTool.testReadUserProfiles();
                    break;
                case 'writeAccess':
                    result = await testTool.testWriteAccess();
                    break;
                case 'realtimeListener':
                    result = await testTool.testRealtimeListener();
                    break;
                default:
                    result = { success: false, message: 'Unknown test' };
            }

            // Update results
            setTestResults(testTool.getResults());
            
            // Show result in alert
            if (result.success) {
                alert(`✅ ${testName} test passed: ${result.message}`);
            } else {
                alert(`❌ ${testName} test failed: ${result.message}`);
            }
        } catch (error) {
            console.error(`${testName} test failed:`, error);
            alert(`❌ ${testName} test failed: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const clearResults = () => {
        testTool.clearResults();
        setTestResults([]);
        setSummary(null);
        setShowResults(false);
    };

    const exportResults = () => {
        testTool.exportResults();
    };

    const getResultIcon = (type) => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    };

    const getResultColor = (type) => {
        switch (type) {
            case 'success': return 'text-green-400';
            case 'error': return 'text-red-400';
            case 'warning': return 'text-yellow-400';
            default: return 'text-blue-400';
        }
    };

    return (
        <div className="p-6 bg-[#0A0D14] min-h-screen">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">🔧 Database Test Tool</h1>
                    <p className="text-[#A0AEC0]">
                        Debug database permission issues and test Firebase connections
                    </p>
                </div>

                {/* User Info */}
                <div className="bg-[#2D3748] rounded-lg p-4 mb-6 border border-[#4A5568]">
                    <h2 className="text-lg font-semibold text-white mb-3">👤 Current User</h2>
                    {user ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-[#A0AEC0]">User ID:</span>
                                <span className="text-white ml-2 font-mono">{user.id}</span>
                            </div>
                            <div>
                                <span className="text-[#A0AEC0]">Email:</span>
                                <span className="text-white ml-2">{user.email || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-[#A0AEC0]">Name:</span>
                                <span className="text-white ml-2">{user.displayName || user.name || 'N/A'}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-red-400">❌ No user authenticated</div>
                    )}
                </div>

                {/* Test Controls */}
                <div className="bg-[#2D3748] rounded-lg p-6 mb-6 border border-[#4A5568]">
                    <h2 className="text-lg font-semibold text-white mb-4">🧪 Test Controls</h2>
                    
                    <div className="flex flex-wrap gap-3 mb-4">
                        <button
                            onClick={runFullTest}
                            disabled={isRunning || !user}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRunning ? '🔄 Running Tests...' : '🚀 Run Full Test Suite'}
                        </button>
                        
                        <button
                            onClick={clearResults}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                        >
                            🗑️ Clear Results
                        </button>
                        
                        <button
                            onClick={exportResults}
                            disabled={testResults.length === 0}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            📥 Export Results
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button
                            onClick={() => runSpecificTest('basicConnection')}
                            disabled={isRunning}
                            className="bg-[#1A202C] text-[#4299E1] px-3 py-2 rounded text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568] disabled:opacity-50"
                        >
                            🔌 Basic Connection
                        </button>
                        
                        <button
                            onClick={() => runSpecificTest('authentication')}
                            disabled={isRunning}
                            className="bg-[#1A202C] text-[#4299E1] px-3 py-2 rounded text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568] disabled:opacity-50"
                        >
                            🔐 Authentication
                        </button>
                        
                        <button
                            onClick={() => runSpecificTest('readRequests')}
                            disabled={isRunning}
                            className="bg-[#1A202C] text-[#4299E1] px-3 py-2 rounded text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568] disabled:opacity-50"
                        >
                            📖 Read Requests
                        </button>
                        
                        <button
                            onClick={() => runSpecificTest('readRequestResponses')}
                            disabled={isRunning}
                            className="bg-[#1A202C] text-[#4299E1] px-3 py-2 rounded text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568] disabled:opacity-50"
                        >
                            💬 Read Responses
                        </button>
                        
                        <button
                            onClick={() => runSpecificTest('readHiddenRequests')}
                            disabled={isRunning}
                            className="bg-[#1A202C] text-[#4299E1] px-3 py-2 rounded text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568] disabled:opacity-50"
                        >
                            🚫 Read Hidden
                        </button>
                        
                        <button
                            onClick={() => runSpecificTest('readUsers')}
                            disabled={isRunning}
                            className="bg-[#1A202C] text-[#4299E1] px-3 py-2 rounded text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568] disabled:opacity-50"
                        >
                            👥 Read Users
                        </button>
                        
                        <button
                            onClick={() => runSpecificTest('readUserProfiles')}
                            disabled={isRunning}
                            className="bg-[#1A202C] text-[#4299E1] px-3 py-2 rounded text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568] disabled:opacity-50"
                        >
                            📋 Read Profiles
                        </button>
                        
                        <button
                            onClick={() => runSpecificTest('writeAccess')}
                            disabled={isRunning}
                            className="bg-[#1A202C] text-[#4299E1] px-3 py-2 rounded text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568] disabled:opacity-50"
                        >
                            ✏️ Write Access
                        </button>
                        
                        <button
                            onClick={() => runSpecificTest('realtimeListener')}
                            disabled={isRunning}
                            className="bg-[#1A202C] text-[#4299E1] px-3 py-2 rounded text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568] disabled:opacity-50"
                        >
                            📡 Real-time Listener
                        </button>
                    </div>
                </div>

                {/* Test Results */}
                {showResults && (
                    <div className="bg-[#2D3748] rounded-lg p-6 border border-[#4A5568]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-white">📊 Test Results</h2>
                            {summary && (
                                <div className="text-sm">
                                    <span className="text-[#A0AEC0]">Results: </span>
                                    <span className={`font-semibold ${summary.success ? 'text-green-400' : 'text-red-400'}`}>
                                        {summary.passed}/{summary.total} passed
                                    </span>
                                </div>
                            )}
                        </div>

                        {testResults.length === 0 ? (
                            <div className="text-[#A0AEC0] text-center py-8">
                                No test results yet. Run a test to see results here.
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {testResults.map((result, index) => (
                                    <div
                                        key={index}
                                        className={`p-3 rounded-lg border ${
                                            result.type === 'success' ? 'bg-green-900 border-green-700' :
                                            result.type === 'error' ? 'bg-red-900 border-red-700' :
                                            result.type === 'warning' ? 'bg-yellow-900 border-yellow-700' :
                                            'bg-[#1A202C] border-[#4A5568]'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className={`text-lg ${getResultColor(result.type)}`}>
                                                {getResultIcon(result.type)}
                                            </span>
                                            <div className="flex-1">
                                                <div className="text-white text-sm">{result.message}</div>
                                                <div className="text-[#A0AEC0] text-xs mt-1">
                                                    {new Date(result.timestamp).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Help Section */}
                <div className="mt-8 bg-[#2D3748] rounded-lg p-6 border border-[#4A5568]">
                    <h2 className="text-lg font-semibold text-white mb-4">💡 How to Use</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-[#4299E1] mb-2">🔍 Troubleshooting Steps</h3>
                            <ol className="text-[#A0AEC0] text-sm space-y-2 list-decimal list-inside">
                                <li>Run the full test suite to identify all issues</li>
                                <li>Check authentication status first</li>
                                <li>Look for specific error codes in the results</li>
                                <li>Verify Firebase security rules are correct</li>
                                <li>Check if required indexes exist</li>
                            </ol>
                        </div>
                        
                        <div>
                            <h3 className="font-semibold text-[#4299E1] mb-2">🚨 Common Error Codes</h3>
                            <div className="text-[#A0AEC0] text-sm space-y-2">
                                <div><strong>permission-denied:</strong> Security rules blocking access</div>
                                <div><strong>failed-precondition:</strong> Missing composite index</div>
                                <div><strong>unauthenticated:</strong> User not logged in</div>
                                <div><strong>not-found:</strong> Collection/document doesn't exist</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DatabaseTestToolComponent;
