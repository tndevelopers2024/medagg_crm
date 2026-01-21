/**
 * Utility functions for role-based access control
 */

/**
 * Get user role from localStorage
 * @returns {string|null} User role or null if not found
 */
export const getUserRole = () => {
    try {
        return localStorage.getItem('role');
    } catch (error) {
        console.error('Failed to get user role:', error);
        return null;
    }
};

/**
 * Get full user object from localStorage
 * @returns {object|null} User object or null if not found
 */
export const getStoredUser = () => {
    try {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error('Failed to get stored user:', error);
        return null;
    }
};

/**
 * Check if user is admin
 * @returns {boolean}
 */
export const isAdmin = () => {
    const role = getUserRole();
    return role && ['admin', 'superadmin', 'owner'].includes(role.toLowerCase());
};

/**
 * Check if user is caller
 * @returns {boolean}
 */
export const isCaller = () => {
    const role = getUserRole();
    return role && role.toLowerCase() === 'caller';
};

/**
 * Check if user has specific role
 * @param {string} requiredRole - Role to check
 * @returns {boolean}
 */
export const hasRole = (requiredRole) => {
    const role = getUserRole();
    return role && role.toLowerCase() === requiredRole.toLowerCase();
};

/**
 * Clear user data from localStorage (for logout)
 */
export const clearUserData = () => {
    try {
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        localStorage.removeItem('token');
    } catch (error) {
        console.error('Failed to clear user data:', error);
    }
};
