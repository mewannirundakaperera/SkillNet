// File: src/components/SetupUserProfiles.jsx
// This component should be added temporarily to run the migration once

import React, { useState } from 'react';
import { migrateUsersToUserProfiles } from '@/utils/migrateUserProfiles';
import { UserCollectionService } from '@/services/user.js';
import { CheckCircleIcon, RefreshIcon, InfoIcon, CelebrationIcon, DatabaseIcon } from '@/components/Icons/SvgIcons';

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
    <div className="p-6 card-dark rounded-lg shadow-lg max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 text-white">
        <DatabaseIcon className="w-8 h-8 inline mr-3 text-[#4299E1]" />
        Database Setup & Migration Tool
      </h2>

      <div className="space-y-6">
        {/* Collection Status Check */}
        <div className="border border-[#4A5568] rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-white">
            <CheckCircleIcon className="w-5 h-5 inline mr-2 text-green-400" />
            1. Check Collection Status
          </h3>
          <p className="text-[#A0AEC0] mb-3">
            First, let's check if the userProfiles collection already exists.
          </p>

          <button
            onClick={handleCheckCollection}
            disabled={checkingCollection}
            className="btn-gradient-primary text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
          >
            {checkingCollection ? 'Checking...' : 'Check Collection'}
          </button>

          {collectionExists !== null && (
            <div className={`mt-3 p-3 rounded ${collectionExists ? 'bg-green-900 text-green-300 border border-green-700' : 'bg-yellow-900 text-yellow-300 border border-yellow-700'}`}>
              {collectionExists ?
                '✅ userProfiles collection exists and has data!' :
                '⚠️ userProfiles collection is empty or doesn\'t exist'
              }
            </div>
          )}
        </div>

        {/* Migration Section */}
        <div className="border border-[#4A5568] rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-white">
            <RefreshIcon className="w-5 h-5 inline mr-2 text-blue-400" />
            2. Run Migration
          </h3>
          <p className="text-[#A0AEC0] mb-3">
            This will create public profiles for all existing users in your users collection.
            {collectionExists && (
              <span className="text-yellow-400 font-semibold">
                {" "}Note: This will update existing profiles if they already exist.
              </span>
            )}
          </p>

          <button
            onClick={handleMigration}
            disabled={migrationStatus === 'running'}
            className={`px-4 py-2 rounded font-semibold ${
              migrationStatus === 'running' 
                ? 'bg-[#4A5568] text-white cursor-not-allowed'
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
          <div className="border border-[#4A5568] rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-white">
              <CheckCircleIcon className="w-5 h-5 inline mr-2 text-green-400" />
              Migration Results
            </h3>

            {migrationResult.success ? (
              <div className="bg-green-900 text-green-300 p-3 rounded border border-green-700">
                <div className="font-semibold">✅ Migration Successful!</div>
                <div className="text-sm mt-1">
                  • Migrated: {migrationResult.migratedCount} users<br/>
                  • Errors: {migrationResult.errorCount} users
                </div>
              </div>
            ) : (
              <div className="bg-red-900 text-red-300 p-3 rounded border border-red-700">
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
          <div className="border border-[#4A5568] rounded-lg p-4 bg-[#2D3748]">
            <h3 className="text-lg font-semibold mb-2 text-[#4299E1]">
              <CelebrationIcon className="w-5 h-5 inline mr-2" />
              Next Steps
            </h3>
            <div className="text-[#E0E0E0] space-y-2">
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
        <div className="border border-[#4A5568] rounded-lg p-4 bg-[#2D3748]">
          <h3 className="text-lg font-semibold mb-2 text-white">
            <InfoIcon className="w-5 h-5 inline mr-2 text-blue-400" />
            What This Does
          </h3>
          <ul className="text-[#A0AEC0] space-y-1 text-sm">
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