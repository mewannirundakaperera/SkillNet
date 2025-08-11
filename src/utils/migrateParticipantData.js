// src/utils/migrateParticipantData.js
// Migration script to fix participant data in group requests
// This ensures that voters and owners are properly included as participants

import { collection, getDocs, doc, updateDoc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const migrateParticipantData = async () => {
  console.log('🔄 Starting participant data migration...');
  
  try {
    // Get all group requests
    const requestsRef = collection(db, 'grouprequests');
    const snapshot = await getDocs(requestsRef);
    
    if (snapshot.empty) {
      console.log('✅ No group requests found to migrate');
      return { success: true, message: 'No requests to migrate' };
    }

    console.log(`📊 Found ${snapshot.docs.length} group requests to process`);
    
    const batch = writeBatch(db);
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each request
    for (const docSnapshot of snapshot.docs) {
      try {
        const request = docSnapshot.data();
        const requestId = docSnapshot.id;
        
        console.log(`\n🔍 Processing request: ${requestId} (${request.title || 'Untitled'})`);
        
        // Get current data
        const currentParticipants = request.participants || [];
        const currentVotes = request.votes || [];
        const requestCreator = request.userId || request.createdBy;
        
        console.log(`   Current participants: ${currentParticipants.length}`);
        console.log(`   Current votes: ${currentVotes.length}`);
        console.log(`   Request creator: ${requestCreator}`);
        
        // Calculate what the participants should be
        const allParticipants = [...new Set([...currentParticipants, ...currentVotes])];
        if (requestCreator && !allParticipants.includes(requestCreator)) {
          allParticipants.push(requestCreator);
        }
        
        // Calculate what the payment data should be
        const currentPaidParticipants = request.paidParticipants || [];
        const expectedPaidParticipants = allParticipants; // All participants should pay by default
        
        console.log(`   Should have participants: ${allParticipants.length}`);
        console.log(`   Current paid participants: ${currentPaidParticipants.length}`);
        console.log(`   Expected paid participants: ${expectedPaidParticipants.length}`);
        
        // Check if update is needed for participants
        const participantsUpdateNeeded = allParticipants.length !== currentParticipants.length;
        // Check if update is needed for payment data
        const paymentUpdateNeeded = expectedPaidParticipants.length !== currentPaidParticipants.length;
        
        if (participantsUpdateNeeded || paymentUpdateNeeded) {
          console.log(`   ⚠️  Update needed:`);
          if (participantsUpdateNeeded) {
            console.log(`      Participants: ${currentParticipants.length} → ${allParticipants.length}`);
          }
          if (paymentUpdateNeeded) {
            console.log(`      Paid participants: ${currentPaidParticipants.length} → ${expectedPaidParticipants.length}`);
          }
          
          // Update the request
          const updateData = {
            participants: allParticipants,
            participantCount: allParticipants.length,
            paidParticipants: expectedPaidParticipants,
            updatedAt: new Date(),
            migrationNote: 'Participant and payment data migrated to include voters and owner'
          };
          
          batch.update(doc(db, 'grouprequests', requestId), updateData);
          updatedCount++;
          
          console.log(`   ✅ Queued for update`);
        } else {
          console.log(`   ✅ No update needed`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing request ${docSnapshot.id}:`, error);
        errorCount++;
      }
    }
    
    // Commit all updates
    if (updatedCount > 0) {
      console.log(`\n💾 Committing ${updatedCount} updates to database...`);
      await batch.commit();
      console.log('✅ Batch update committed successfully');
    } else {
      console.log('\n✅ No updates needed');
    }
    
    // Summary
    const summary = {
      success: true,
      totalRequests: snapshot.docs.length,
      updatedRequests: updatedCount,
      errorCount: errorCount,
      message: `Migration completed: ${updatedCount} requests updated, ${errorCount} errors`
    };
    
    console.log('\n📊 Migration Summary:', summary);
    return summary;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Migration failed'
    };
  }
};

// Function to migrate a single request (for testing)
export const migrateSingleRequest = async (requestId) => {
  try {
    console.log(`🔄 Migrating single request: ${requestId}`);
    
    const requestRef = doc(db, 'grouprequests', requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    const request = requestSnap.data();
    
    // Get current data
    const currentParticipants = request.participants || [];
    const currentVotes = request.votes || [];
    const requestCreator = request.userId || request.createdBy;
    
    // Calculate what the participants should be
    const allParticipants = [...new Set([...currentParticipants, ...currentVotes])];
    if (requestCreator && !allParticipants.includes(requestCreator)) {
      allParticipants.push(requestCreator);
    }
    
    // Calculate what the payment data should be
    const currentPaidParticipants = request.paidParticipants || [];
    const expectedPaidParticipants = allParticipants; // All participants should pay by default
    
    // Update if needed
    const participantsUpdateNeeded = allParticipants.length !== currentParticipants.length;
    const paymentUpdateNeeded = expectedPaidParticipants.length !== currentPaidParticipants.length;
    
    if (participantsUpdateNeeded || paymentUpdateNeeded) {
      const updateData = {
        participants: allParticipants,
        participantCount: allParticipants.length,
        paidParticipants: expectedPaidParticipants,
        updatedAt: new Date(),
        migrationNote: 'Single request participant and payment data migrated'
      };
      
      await updateDoc(requestRef, updateData);
      
      return {
        success: true,
        requestId,
        oldParticipantCount: currentParticipants.length,
        newParticipantCount: allParticipants.length,
        oldPaidCount: currentPaidParticipants.length,
        newPaidCount: expectedPaidParticipants.length,
        message: 'Request migrated successfully'
      };
    } else {
      return {
        success: true,
        requestId,
        message: 'No update needed'
      };
    }
    
  } catch (error) {
    console.error('❌ Single request migration failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Single request migration failed'
    };
  }
};

// Function to validate participant data consistency
export const validateParticipantData = async () => {
  try {
    console.log('🔍 Validating participant data consistency...');
    
    const requestsRef = collection(db, 'grouprequests');
    const snapshot = await getDocs(requestsRef);
    
    if (snapshot.empty) {
      console.log('✅ No requests to validate');
      return { success: true, message: 'No requests to validate' };
    }
    
    const validationResults = [];
    let inconsistentCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      const request = docSnapshot.data();
      const requestId = docSnapshot.id;
      
      const currentParticipants = request.participants || [];
      const currentVotes = request.votes || [];
      const requestCreator = request.userId || request.createdBy;
      
      // Calculate what the participants should be
      const allParticipants = [...new Set([...currentParticipants, ...currentVotes])];
      if (requestCreator && !allParticipants.includes(requestCreator)) {
        allParticipants.push(requestCreator);
      }
      
      // Calculate what the payment data should be
      const currentPaidParticipants = request.paidParticipants || [];
      const expectedPaidParticipants = allParticipants; // All participants should pay by default
      
      const isParticipantsConsistent = allParticipants.length === currentParticipants.length;
      const isPaymentConsistent = expectedPaidParticipants.length === currentPaidParticipants.length;
      const isConsistent = isParticipantsConsistent && isPaymentConsistent;
      
      if (!isConsistent) {
        inconsistentCount++;
      }
      
      validationResults.push({
        requestId,
        title: request.title || 'Untitled',
        currentParticipants: currentParticipants.length,
        expectedParticipants: allParticipants.length,
        currentPaidParticipants: currentPaidParticipants.length,
        expectedPaidParticipants: expectedPaidParticipants.length,
        isParticipantsConsistent,
        isPaymentConsistent,
        isConsistent,
        missingParticipants: allParticipants.length - currentParticipants.length,
        missingPaidParticipants: expectedPaidParticipants.length - currentPaidParticipants.length
      });
    }
    
    const summary = {
      success: true,
      totalRequests: snapshot.docs.length,
      consistentRequests: snapshot.docs.length - inconsistentCount,
      inconsistentRequests: inconsistentCount,
      results: validationResults
    };
    
    console.log('\n📊 Validation Summary:', {
      total: summary.totalRequests,
      consistent: summary.consistentRequests,
      inconsistent: summary.inconsistentRequests
    });
    
    if (inconsistentCount > 0) {
      console.log('\n⚠️  Inconsistent requests found:');
      validationResults
        .filter(r => !r.isConsistent)
        .forEach(r => {
          console.log(`   ${r.requestId}: ${r.title} (${r.currentParticipants} → ${r.expectedParticipants})`);
        });
    }
    
    return summary;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Validation failed'
    };
  }
};

// Export for use in other files
export default {
  migrateParticipantData,
  migrateSingleRequest,
  validateParticipantData
};
