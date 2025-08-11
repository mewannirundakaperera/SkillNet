// Database Test Tool for debugging permission issues
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs, 
    getDoc, 
    doc, 
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/config/firebase';

class DatabaseTestTool {
    constructor() {
        this.testResults = [];
        this.currentUser = null;
    }

    setCurrentUser(user) {
        this.currentUser = user;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message, type };
        this.testResults.push(logEntry);
        console.log(`[${type.toUpperCase()}] ${message}`);
        return logEntry;
    }

    clearResults() {
        this.testResults = [];
    }

    getResults() {
        return this.testResults;
    }

    // Test basic database connection
    async testBasicConnection() {
        this.log('🔍 Testing basic database connection...', 'info');
        
        try {
            // Try to access a simple collection
            const testRef = collection(db, 'test');
            this.log('✅ Basic collection access successful', 'success');
            return { success: true, message: 'Basic connection successful' };
        } catch (error) {
            this.log(`❌ Basic connection failed: ${error.message}`, 'error');
            return { success: false, message: error.message, error };
        }
    }

    // Test authentication status
    testAuthentication() {
        this.log('🔍 Testing authentication status...', 'info');
        
        if (!this.currentUser) {
            this.log('❌ No user authenticated', 'error');
            return { success: false, message: 'No user authenticated' };
        }

        this.log(`✅ User authenticated: ${this.currentUser.email || this.currentUser.id}`, 'success');
        this.log(`   User ID: ${this.currentUser.id}`, 'info');
        this.log(`   Email: ${this.currentUser.email || 'N/A'}`, 'info');
        
        return { 
            success: true, 
            message: 'User authenticated',
            userId: this.currentUser.id,
            email: this.currentUser.email
        };
    }

    // Test reading from requests collection
    async testReadRequests() {
        this.log('🔍 Testing read access to requests collection...', 'info');
        
        try {
            const requestsRef = collection(db, 'requests');
            const q = query(requestsRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            
            this.log(`✅ Read requests successful: ${snapshot.docs.length} documents found`, 'success');
            return { 
                success: true, 
                message: `Read successful: ${snapshot.docs.length} documents`,
                count: snapshot.docs.length
            };
        } catch (error) {
            this.log(`❌ Read requests failed: ${error.message}`, 'error');
            this.log(`   Error code: ${error.code}`, 'error');
            this.log(`   Error details: ${JSON.stringify(error, null, 2)}`, 'error');
            return { success: false, message: error.message, error };
        }
    }

    // Test reading from requestResponses collection
    async testReadRequestResponses() {
        this.log('🔍 Testing read access to requestResponses collection...', 'info');
        
        try {
            const responsesRef = collection(db, 'requestResponses');
            const q = query(responsesRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            
            this.log(`✅ Read requestResponses successful: ${snapshot.docs.length} documents found`, 'success');
            return { 
                success: true, 
                message: `Read successful: ${snapshot.docs.length} documents`,
                count: snapshot.docs.length
            };
        } catch (error) {
            this.log(`❌ Read requestResponses failed: ${error.message}`, 'error');
            this.log(`   Error code: ${error.code}`, 'error');
            this.log(`   Error details: ${JSON.stringify(error, null, 2)}`, 'error');
            return { success: false, message: error.message, error };
        }
    }

    // Test reading from hiddenRequests collection
    async testReadHiddenRequests() {
        this.log('🔍 Testing read access to hiddenRequests collection...', 'info');
        
        try {
            const hiddenRef = collection(db, 'hiddenRequests');
            const q = query(hiddenRef);
            const snapshot = await getDocs(q);
            
            this.log(`✅ Read hiddenRequests successful: ${snapshot.docs.length} documents found`, 'success');
            return { 
                success: true, 
                message: `Read successful: ${snapshot.docs.length} documents`,
                count: snapshot.docs.length
            };
        } catch (error) {
            this.log(`❌ Read hiddenRequests failed: ${error.message}`, 'error');
            this.log(`   Error code: ${error.code}`, 'error');
            this.log(`   Error details: ${JSON.stringify(error, null, 2)}`, 'error');
            return { success: false, message: error.message, error };
        }
    }

    // Test reading from users collection
    async testReadUsers() {
        this.log('🔍 Testing read access to users collection...', 'info');
        
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef);
            const snapshot = await getDocs(q);
            
            this.log(`✅ Read users successful: ${snapshot.docs.length} documents found`, 'success');
            return { 
                success: true, 
                message: `Read successful: ${snapshot.docs.length} documents`,
                count: snapshot.docs.length
            };
        } catch (error) {
            this.log(`❌ Read users failed: ${error.message}`, 'error');
            this.log(`   Error code: ${error.code}`, 'error');
            this.log(`   Error details: ${JSON.stringify(error, null, 2)}`, 'error');
            return { success: false, message: error.message, error };
        }
    }

    // Test reading from userProfiles collection
    async testReadUserProfiles() {
        this.log('🔍 Testing read access to userProfiles collection...', 'info');
        
        try {
            const profilesRef = collection(db, 'userProfiles');
            const q = query(profilesRef);
            const snapshot = await getDocs(q);
            
            this.log(`✅ Read userProfiles successful: ${snapshot.docs.length} documents found`, 'success');
            return { 
                success: true, 
                message: `Read successful: ${snapshot.docs.length} documents`,
                count: snapshot.docs.length
            };
        } catch (error) {
            this.log(`❌ Read userProfiles failed: ${error.message}`, 'error');
            this.log(`   Error code: ${error.code}`, 'error');
            this.log(`   Error details: ${JSON.stringify(error, null, 2)}`, 'error');
            return { success: false, message: error.message, error };
        }
    }

    // Test writing to a test collection
    async testWriteAccess() {
        this.log('🔍 Testing write access...', 'info');
        
        try {
            const testRef = collection(db, 'test');
            const testDoc = await addDoc(testRef, {
                test: true,
                timestamp: serverTimestamp(),
                userId: this.currentUser?.id || 'unknown'
            });
            
            this.log(`✅ Write test successful: Document ID ${testDoc.id}`, 'success');
            
            // Clean up - delete the test document
            await deleteDoc(testDoc);
            this.log('✅ Test document cleaned up', 'success');
            
            return { 
                success: true, 
                message: 'Write and delete test successful',
                documentId: testDoc.id
            };
        } catch (error) {
            this.log(`❌ Write test failed: ${error.message}`, 'error');
            this.log(`   Error code: ${error.code}`, 'error');
            this.log(`   Error details: ${JSON.stringify(error, null, 2)}`, 'error');
            return { success: false, message: error.message, error };
        }
    }

    // Test specific user's requests
    async testUserRequests(userId) {
        this.log(`🔍 Testing user-specific requests for user: ${userId}`, 'info');
        
        try {
            const requestsRef = collection(db, 'requests');
            const q = query(
                requestsRef,
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            
            this.log(`✅ User requests read successful: ${snapshot.docs.length} documents found`, 'success');
            return { 
                success: true, 
                message: `User requests read successful: ${snapshot.docs.length} documents`,
                count: snapshot.docs.length,
                requests: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            };
        } catch (error) {
            this.log(`❌ User requests read failed: ${error.message}`, 'error');
            this.log(`   Error code: ${error.code}`, 'error');
            this.log(`   Error details: ${JSON.stringify(error, null, 2)}`, 'error');
            return { success: false, message: error.message, error };
        }
    }

    // Test specific user's responses
    async testUserResponses(userId) {
        this.log(`🔍 Testing user-specific responses for user: ${userId}`, 'info');
        
        try {
            const responsesRef = collection(db, 'requestResponses');
            const q = query(
                responsesRef,
                where('responderId', '==', userId),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            
            this.log(`✅ User responses read successful: ${snapshot.docs.length} documents found`, 'success');
            return { 
                success: true, 
                message: `User responses read successful: ${snapshot.docs.length} documents`,
                count: snapshot.docs.length,
                responses: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            };
        } catch (error) {
            this.log(`❌ User responses read failed: ${error.message}`, 'error');
            this.log(`   Error code: ${error.code}`, 'error');
            this.log(`   Error details: ${JSON.stringify(error, null, 2)}`, 'error');
            return { success: false, message: error.message, error };
        }
    }

    // Test real-time listener
    async testRealtimeListener() {
        this.log('🔍 Testing real-time listener...', 'info');
        
        return new Promise((resolve) => {
            try {
                const requestsRef = collection(db, 'requests');
                const q = query(requestsRef, orderBy('createdAt', 'desc'));
                
                const unsubscribe = onSnapshot(q, 
                    (snapshot) => {
                        this.log(`✅ Real-time listener working: ${snapshot.docs.length} documents`, 'success');
                        unsubscribe();
                        resolve({ 
                            success: true, 
                            message: 'Real-time listener working',
                            count: snapshot.docs.length
                        });
                    },
                    (error) => {
                        this.log(`❌ Real-time listener failed: ${error.message}`, 'error');
                        this.log(`   Error code: ${error.code}`, 'error');
                        resolve({ success: false, message: error.message, error });
                    }
                );
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    unsubscribe();
                    this.log('⏰ Real-time listener timeout', 'warning');
                    resolve({ success: false, message: 'Real-time listener timeout' });
                }, 5000);
                
            } catch (error) {
                this.log(`❌ Real-time listener setup failed: ${error.message}`, 'error');
                resolve({ success: false, message: error.message, error });
            }
        });
    }

    // Run comprehensive test suite
    async runFullTest() {
        this.log('🚀 Starting comprehensive database test suite...', 'info');
        this.clearResults();
        
        const results = {
            basicConnection: await this.testBasicConnection(),
            authentication: this.testAuthentication(),
            readRequests: await this.testReadRequests(),
            readRequestResponses: await this.testReadRequestResponses(),
            readHiddenRequests: await this.testReadHiddenRequests(),
            readUsers: await this.testReadUsers(),
            readUserProfiles: await this.testReadUserProfiles(),
            writeAccess: await this.testWriteAccess(),
            realtimeListener: await this.testRealtimeListener()
        };

        // Test user-specific data if authenticated
        if (this.currentUser?.id) {
            results.userRequests = await this.testUserRequests(this.currentUser.id);
            results.userResponses = await this.testUserResponses(this.currentUser.id);
        }

        this.log('🏁 Test suite completed', 'info');
        
        // Summary
        const passed = Object.values(results).filter(r => r.success).length;
        const total = Object.keys(results).length;
        
        this.log(`📊 Test Results: ${passed}/${total} tests passed`, passed === total ? 'success' : 'warning');
        
        return {
            results,
            summary: {
                passed,
                total,
                success: passed === total
            }
        };
    }

    // Generate test report
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            user: this.currentUser ? {
                id: this.currentUser.id,
                email: this.currentUser.email
            } : null,
            results: this.getResults(),
            summary: this.getResults().reduce((acc, result) => {
                if (result.type === 'success') acc.success++;
                if (result.type === 'error') acc.errors++;
                if (result.type === 'warning') acc.warnings++;
                return acc;
            }, { success: 0, errors: 0, warnings: 0 })
        };

        return report;
    }

    // Export test results as JSON
    exportResults() {
        const report = this.generateReport();
        const dataStr = JSON.stringify(report, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `database-test-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }
}

export default DatabaseTestTool;
