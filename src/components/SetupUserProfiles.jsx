// File: src/components/SetupUserProfiles.jsx
// This component should be added temporarily to run the migration once

import React, { useState } from 'react';
import { migrateUsersToUserProfiles } from '@/utils/migrateUserProfiles';
import { UserCollectionService } from '@/services/user.js';

export default function SetupUserProfiles() {
  const [migrationStatus, setMigrationStatus] = useState('ready'); // ready, running, success, error
  const [migrationResult, setMigrationResult] = useState(null);
  const [checkingCollection, setCheckingCollection] = useState(false);
  const [collectionExists, setCollectionExists] = useState(null);

  const handleCheckCollection = async () => {
    setCheckingCollection(true);
    try {
      const exists = await UserCollectionService.checkUserProfilesCollection();
      setCollectionExists(exists);
    } catch (error) {
      console.error('Error checking collection:', error);
      setCollectionExists(false);
    } finally {
      setCheckingCollection(false);
    }
  };

  const handleMigration = async () => {
    setMigrationStatus('running');
    try {
      const result = await migrateUsersToUserProfiles();
      setMigrationResult(result);

      if (result.success) {
        setMigrationStatus('success');
        // Re-check collection status
        await handleCheckCollection();
      } else {
        setMigrationStatus('error');
      }
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationResult({
        success: false,
        error: error.message
      });
      setMigrationStatus('error');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        🔧 UserProfiles Collection Setup
      </h2>

      <div className="space-y-6">
        {/* Collection Status Check */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">1. Check Collection Status</h3>
          <p className="text-gray-600 mb-3">
            First, let's check if the userProfiles collection already exists.
          </p>

          <button
            onClick={handleCheckCollection}
            disabled={checkingCollection}
            className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {checkingCollection ? 'Checking...' : 'Check Collection'}
          </button>

          {collectionExists !== null && (
            <div className={`mt-3 p-3 rounded ${collectionExists ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {collectionExists ?
                '✅ userProfiles collection exists and has data!' :
                '⚠️ userProfiles collection is empty or doesn\'t exist'
              }
            </div>
          )}
        </div>

        {/* Migration Section */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">2. Run Migration</h3>
          <p className="text-gray-600 mb-3">
            This will create public profiles for all existing users in your users collection.
            {collectionExists && (
              <span className="text-yellow-600 font-semibold">
                {" "}Note: This will update existing profiles if they already exist.
              </span>
            )}
          </p>

          <button
            onClick={handleMigration}
            disabled={migrationStatus === 'running'}
            className={`px-4 py-2 rounded font-semibold ${
              migrationStatus === 'running' 
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : migrationStatus === 'success'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {migrationStatus === 'running' && '🔄 Running Migration...'}
            {migrationStatus === 'ready' && '🚀 Start Migration'}
            {migrationStatus === 'success' && '✅ Migration Completed'}
            {migrationStatus === 'error' && '❌ Migration Failed - Retry'}
          </button>
        </div>

        {/* Migration Results */}
        {migrationResult && (
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Migration Results</h3>

            {migrationResult.success ? (
              <div className="bg-green-100 text-green-800 p-3 rounded">
                <div className="font-semibold">✅ Migration Successful!</div>
                <div className="text-sm mt-1">
                  • Migrated: {migrationResult.migratedCount} users<br/>
                  • Errors: {migrationResult.errorCount} users
                </div>
              </div>
            ) : (
              <div className="bg-red-100 text-red-800 p-3 rounded">
                <div className="font-semibold">❌ Migration Failed</div>
                <div className="text-sm mt-1">
                  Error: {migrationResult.error}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Next Steps */}
        {migrationStatus === 'success' && (
          <div className="border rounded-lg p-4 bg-blue-50">
            <h3 className="text-lg font-semibold mb-2 text-blue-800">🎉 Next Steps</h3>
            <div className="text-blue-700 space-y-2">
              <p>✅ Your userProfiles collection has been created successfully!</p>
              <p>✅ Profile editing should now work without errors</p>
              <p>✅ Search functionality will now use public profiles</p>
              <p className="font-semibold mt-3">
                🗑️ You can now remove this setup component from your app.
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="text-lg font-semibold mb-2">ℹ️ What This Does</h3>
          <ul className="text-gray-700 space-y-1 text-sm">
            <li>• Creates a <code>userProfiles</code> collection with public user data</li>
            <li>• Copies safe fields: displayName, bio, location, skills, interests, avatar</li>
            <li>• Excludes private data: email, settings, private stats</li>
            <li>• Enables secure search functionality</li>
            <li>• Fixes profile update errors</li>
          </ul>
        </div>
      </div>
    </div>
  );
}