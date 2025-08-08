import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.js';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase.js';
import { groupRequestService } from '@/services/groupRequestService';

const CreateGroupRequest = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const preSelectedGroupId = searchParams.get('groupId');

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        skills: [],
        category: '',
        urgency: 'medium',
        duration: '',
        rate: '',
        sessionType: 'group-session', // "one-on-one", "group-session", "mentorship"
        maxParticipants: 1,
        deadline: '',
        targetGroupId: preSelectedGroupId || '',
        isOpenToAll: false,
        tags: []
    });

    // UI state
    const [loading, setLoading] = useState(false);
    const [userGroups, setUserGroups] = useState([]);
    const [skillInput, setSkillInput] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [errors, setErrors] = useState({});

    const categories = [
        'Programming & Development',
        'Design & Creative',
        'Data Science & Analytics',
        'Business & Marketing',
        'Language Learning',
        'Academic Help',
        'Career Guidance',
        'Technical Skills',
        'Soft Skills',
        'Project Collaboration',
        'Other'
    ];

    useEffect(() => {
        loadUserGroups();
    }, [user]);

    const loadUserGroups = async () => {
        if (!user?.id) return;

        try {
            const groupsRef = collection(db, 'groups');
            const q = query(groupsRef, where('members', 'array-contains', user.id));
            const snapshot = await getDocs(q);

            const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUserGroups(groups);

            if (preSelectedGroupId) {
                const preSelectedGroup = groups.find(g => g.id === preSelectedGroupId);
                if (!preSelectedGroup) {
                    setFormData(prev => ({ ...prev, targetGroupId: '' }));
                }
            }
        } catch (error) {
            console.error('Error loading user groups:', error);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const addSkill = () => {
        const skill = skillInput.trim();
        if (skill && !formData.skills.some(s => s.toLowerCase() === skill.toLowerCase())) {
            setFormData(prev => ({
                ...prev,
                skills: [...prev.skills, skill]
            }));
            setSkillInput('');
        }
    };

    const removeSkill = skillToRemove => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.filter(skill => skill !== skillToRemove)
        }));
    };

    const addTag = () => {
        const tag = tagInput.trim();
        if (tag && !formData.tags.some(t => t.toLowerCase() === tag.toLowerCase())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, tag]
            }));
            setTagInput('');
        }
    };

    const removeTag = tagToRemove => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.category) newErrors.category = 'Category is required';
        if (!formData.targetGroupId) newErrors.targetGroupId = 'Please select a group';

        if (formData.sessionType === 'group-session' && formData.maxParticipants < 2) {
            newErrors.maxParticipants = 'Group sessions must allow at least 2 participants';
        }

        if (formData.deadline) {
            const deadlineDate = new Date(formData.deadline);
            if (deadlineDate <= new Date()) {
                newErrors.deadline = 'Deadline must be in the future';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!validateForm()) return;
        if (!user?.id) {
            alert('You must be logged in to create a request.');
            return;
        }

        setLoading(true);

        try {
            // Get group information
            const groupRef = doc(db, 'groups', formData.targetGroupId);
            const groupSnap = await getDoc(groupRef);

            if (!groupSnap.exists()) {
                alert('Selected group not found.');
                setLoading(false);
                return;
            }

            const groupData = groupSnap.data();

            // Prepare request data with all required fields
            const requestData = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                skills: formData.skills,
                category: formData.category,
                urgency: formData.urgency,
                duration: formData.duration.trim(),
                rate: formData.rate.trim(),
                sessionType: formData.sessionType,
                maxParticipants: formData.maxParticipants,
                deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
                targetGroupId: formData.targetGroupId,
                isOpenToAll: formData.isOpenToAll,
                tags: formData.tags,
                createdByName: user.displayName || user.name || user.email.split('@')[0],
                createdByEmail: user.email,
                createdByAvatar: user.avatar || user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=3b82f6&color=fff`
            };

            // Use the group request service
            const result = await groupRequestService.createGroupRequest(requestData, user.id);

            if (result.success) {
                // Show success message
                alert(result.message);

                // Navigate back to previous page
                navigate(-1);
            } else {
                alert(result.message);
            }

        } catch (error) {
            console.error('Error creating group request:', error);
            alert('Failed to create request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow border p-6 mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Create Group Request</h1>
                    <p className="text-gray-600 mt-1">Share your learning needs with your group members.</p>
                </div>
                <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700" title="Cancel">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="bg-white p-6 rounded-lg shadow border">
                    <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="lg:col-span-2">
                            <label className="block mb-2 font-medium text-gray-700">
                                Request Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => handleInputChange('title', e.target.value)}
                                className={`w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                                    errors.title ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., Need help with React Hooks"
                            />
                            {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
                        </div>

                        <div>
                            <label className="block mb-2 font-medium text-gray-700">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.category}
                                onChange={e => handleInputChange('category', e.target.value)}
                                className={`w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                                    errors.category ? 'border-red-500' : 'border-gray-300'
                                }`}
                            >
                                <option value="">Select a category</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                            {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category}</p>}
                        </div>

                        <div>
                            <label className="block mb-2 font-medium text-gray-700">
                                Target Group <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.targetGroupId}
                                onChange={e => handleInputChange('targetGroupId', e.target.value)}
                                className={`w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                                    errors.targetGroupId ? 'border-red-500' : 'border-gray-300'
                                }`}
                            >
                                <option value="">Select a group</option>
                                {userGroups.map(group => (
                                    <option key={group.id} value={group.id}>
                                        {group.name} ({group.memberCount || group.members?.length || 0} members)
                                    </option>
                                ))}
                            </select>
                            {errors.targetGroupId && <p className="text-red-600 text-sm mt-1">{errors.targetGroupId}</p>}
                            {userGroups.length === 0 && (
                                <p className="text-sm text-gray-500 mt-1">
                                    You must be a member of at least one group to create requests.
                                </p>
                            )}
                        </div>

                        <div className="lg:col-span-2">
                            <label className="block mb-2 font-medium text-gray-700">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={e => handleInputChange('description', e.target.value)}
                                rows={4}
                                placeholder="Describe what you need help with..."
                                className={`w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                                    errors.description ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
                        </div>
                    </div>
                </div>

                {/* Session Details */}
                <div className="bg-white p-6 rounded-lg shadow border">
                    <h2 className="text-xl font-semibold mb-4">Session Details</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="block mb-2 font-medium text-gray-700">Session Type</label>
                            <select
                                value={formData.sessionType}
                                onChange={e => handleInputChange('sessionType', e.target.value)}
                                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="one-on-one">One-on-One</option>
                                <option value="group-session">Group Session</option>
                                <option value="mentorship">Long-term Mentorship</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2 font-medium text-gray-700">Urgency</label>
                            <select
                                value={formData.urgency}
                                onChange={e => handleInputChange('urgency', e.target.value)}
                                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="low">Low - Flexible timing</option>
                                <option value="medium">Medium - Within a week</option>
                                <option value="high">High - ASAP</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2 font-medium text-gray-700">Expected Duration</label>
                            <input
                                type="text"
                                value={formData.duration}
                                onChange={e => handleInputChange('duration', e.target.value)}
                                placeholder="e.g., 1 hour, 2-3 sessions, ongoing"
                                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {formData.sessionType === 'group-session' && (
                            <div>
                                <label className="block mb-2 font-medium text-gray-700">Max Participants</label>
                                <input
                                    type="number"
                                    min={2}
                                    max={20}
                                    value={formData.maxParticipants}
                                    onChange={e => handleInputChange('maxParticipants', parseInt(e.target.value) || 2)}
                                    className={`w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                                        errors.maxParticipants ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.maxParticipants && <p className="text-red-600 text-sm mt-1">{errors.maxParticipants}</p>}
                            </div>
                        )}

                        <div>
                            <label className="block mb-2 font-medium text-gray-700">Rate (Optional)</label>
                            <input
                                type="text"
                                value={formData.rate}
                                onChange={e => handleInputChange('rate', e.target.value)}
                                placeholder="e.g., $25/hour, Free"
                                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block mb-2 font-medium text-gray-700">Deadline (Optional)</label>
                            <input
                                type="datetime-local"
                                value={formData.deadline}
                                onChange={e => handleInputChange('deadline', e.target.value)}
                                className={`w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                                    errors.deadline ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.deadline && <p className="text-red-600 text-sm mt-1">{errors.deadline}</p>}
                        </div>
                    </div>
                </div>

                {/* Skills & Tags */}
                <div className="bg-white p-6 rounded-lg shadow border">
                    <h2 className="text-xl font-semibold mb-4">Skills & Tags</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Skills */}
                        <div>
                            <label className="block mb-2 font-medium text-gray-700">Required Skills</label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={skillInput}
                                    onChange={e => setSkillInput(e.target.value)}
                                    onKeyPress={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addSkill();
                                        }
                                    }}
                                    placeholder="Add a skill and press Enter"
                                    className="flex-1 border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={addSkill}
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.skills.map((skill, i) => (
                                    <span
                                        key={i}
                                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                                    >
                    {skill}
                                        <button type="button" onClick={() => removeSkill(skill)} className="text-blue-600 hover:text-blue-900">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block mb-2 font-medium text-gray-700">Tags (Optional)</label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyPress={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addTag();
                                        }
                                    }}
                                    placeholder="Add tags for discoverability"
                                    className="flex-1 border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={addTag}
                                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.tags.map((tag, i) => (
                                    <span
                                        key={i}
                                        className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                                    >
                    #{tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="text-gray-600 hover:text-gray-900">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Open to All Members */}
                    <div className="mt-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isOpenToAll}
                                onChange={e => handleInputChange('isOpenToAll', e.target.checked)}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div>
                                <span className="text-sm font-medium text-gray-700">Open to all group members</span>
                                <p className="text-xs text-gray-500">Allows all group members to see and respond</p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-white p-6 rounded-lg shadow border flex justify-between items-center">
                    <div>
                        <p className="text-sm text-gray-500">
                            By creating this request, you agree to our community guidelines and terms of service.
                        </p>
                        {userGroups.length === 0 && (
                            <p className="text-red-600 text-sm mt-1">
                                ⚠️ You need to join at least one group before creating requests.
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={loading}
                            className="px-6 py-2 border rounded text-gray-700 hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || userGroups.length === 0}
                            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading && (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                            )}
                            {loading ? 'Creating...' : 'Create Request'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateGroupRequest;