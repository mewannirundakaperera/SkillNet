// src/services/requestValidationService.js

export const requestValidationService = {
    /**
     * Validate group request form data
     * @param {Object} formData - The form data to validate
     * @returns {Object} - Object containing isValid boolean and errors object
     */
    validateGroupRequest(formData) {
        const errors = {};

        // Required fields
        if (!formData.title || !formData.title.trim()) {
            errors.title = 'Title is required';
        } else if (formData.title.length < 5) {
            errors.title = 'Title must be at least 5 characters long';
        } else if (formData.title.length > 100) {
            errors.title = 'Title must be less than 100 characters';
        }

        if (!formData.description || !formData.description.trim()) {
            errors.description = 'Description is required';
        } else if (formData.description.length < 20) {
            errors.description = 'Description must be at least 20 characters long';
        } else if (formData.description.length > 1000) {
            errors.description = 'Description must be less than 1000 characters';
        }

        if (!formData.category) {
            errors.category = 'Category is required';
        }

        if (!formData.targetGroupId) {
            errors.targetGroupId = 'Please select a group';
        }

        // Session type specific validations
        if (formData.sessionType === 'group-session') {
            if (!formData.maxParticipants || formData.maxParticipants < 2) {
                errors.maxParticipants = 'Group sessions must allow at least 2 participants';
            } else if (formData.maxParticipants > 50) {
                errors.maxParticipants = 'Maximum participants cannot exceed 50';
            }
        }

        // Deadline validation
        if (formData.deadline) {
            const deadlineDate = new Date(formData.deadline);
            const now = new Date();
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(now.getFullYear() + 1);

            if (deadlineDate <= now) {
                errors.deadline = 'Deadline must be in the future';
            } else if (deadlineDate > oneYearFromNow) {
                errors.deadline = 'Deadline cannot be more than 1 year from now';
            }
        }

        // Rate validation (if provided)
        if (formData.rate && formData.rate.trim()) {
            const rate = formData.rate.trim();
            if (rate.length > 50) {
                errors.rate = 'Rate description is too long';
            }
        }

        // Duration validation (if provided)
        if (formData.duration && formData.duration.trim()) {
            const duration = formData.duration.trim();
            if (duration.length > 100) {
                errors.duration = 'Duration description is too long';
            }
        }

        // Skills validation
        if (formData.skills && formData.skills.length > 20) {
            errors.skills = 'Maximum 20 skills allowed';
        }

        // Tags validation
        if (formData.tags && formData.tags.length > 15) {
            errors.tags = 'Maximum 15 tags allowed';
        }

        // Check for invalid characters in skills and tags
        if (formData.skills) {
            formData.skills.forEach((skill, index) => {
                if (skill.length > 30) {
                    errors.skills = `Skill "${skill}" is too long (max 30 characters)`;
                }
            });
        }

        if (formData.tags) {
            formData.tags.forEach((tag, index) => {
                if (tag.length > 20) {
                    errors.tags = `Tag "${tag}" is too long (max 20 characters)`;
                }
            });
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    },

    /**
     * Sanitize form data before submission
     * @param {Object} formData - The form data to sanitize
     * @returns {Object} - Sanitized form data
     */
    sanitizeGroupRequest(formData) {
        return {
            ...formData,
            title: formData.title?.trim() || '',
            description: formData.description?.trim() || '',
            category: formData.category?.trim() || '',
            rate: formData.rate?.trim() || '',
            duration: formData.duration?.trim() || '',
            skills: formData.skills?.map(skill => skill.trim()).filter(skill => skill) || [],
            tags: formData.tags?.map(tag => tag.trim()).filter(tag => tag) || [],
            maxParticipants: parseInt(formData.maxParticipants) || 1,
            deadline: formData.deadline || null
        };
    },

    /**
     * Get user-friendly error messages
     * @param {Object} errors - Validation errors object
     * @returns {Array} - Array of user-friendly error messages
     */
    getErrorMessages(errors) {
        const messages = [];

        Object.keys(errors).forEach(field => {
            const error = errors[field];
            if (error) {
                messages.push(error);
            }
        });

        return messages;
    },

    /**
     * Check if user has permission to create requests in a group
     * @param {Object} group - Group data
     * @param {string} userId - User ID
     * @returns {Object} - Permission check result
     */
    checkGroupRequestPermission(group, userId) {
        if (!group) {
            return {
                canCreate: false,
                reason: 'Group not found'
            };
        }

        // Check if user is a member
        if (!group.members?.includes(userId) && !group.hiddenMembers?.includes(userId)) {
            return {
                canCreate: false,
                reason: 'You must be a member of this group to create requests'
            };
        }

        // Check if group allows requests (if such a setting exists)
        if (group.allowRequests === false) {
            return {
                canCreate: false,
                reason: 'This group does not allow member requests'
            };
        }

        return {
            canCreate: true,
            reason: 'Permission granted'
        };
    }
};