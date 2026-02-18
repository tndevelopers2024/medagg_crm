/**
 * Utility functions for role-based access control.
 * Supports both legacy string roles and new Role objects.
 */

/**
 * Extract the role name string from a role value.
 * Handles: string ("admin"), object ({ name: "Admin", ... }), or null.
 */
export const getRoleName = (role) => {
    if (!role) return '';
    if (typeof role === 'string') return role.toLowerCase();
    if (typeof role === 'object' && role.name) return role.name.toLowerCase();
    return '';
};

/**
 * Get user role name from localStorage
 * @returns {string|null}
 */
export const getUserRole = () => {
    try {
        // Try the simple 'role' key first (could be string or JSON)
        const storedRole = localStorage.getItem('role');
        if (storedRole) {
            try {
                const parsed = JSON.parse(storedRole);
                return getRoleName(parsed);
            } catch {
                return storedRole.toLowerCase();
            }
        }

        // Fall back to user object
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const role = user?.data?.role || user?.role;
            return getRoleName(role);
        }
        return null;
    } catch (error) {
        console.error('Failed to get user role:', error);
        return null;
    }
};

/**
 * Get full user object from localStorage
 * @returns {object|null}
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
    return role && ['admin', 'superadmin', 'owner'].includes(role);
};

/**
 * Check if user is caller
 * @returns {boolean}
 */
export const isCaller = () => {
    const role = getUserRole();
    return role && role === 'caller';
};

/**
 * Check if user has specific role
 * @param {string} requiredRole - Role to check
 * @returns {boolean}
 */
export const hasRole = (requiredRole) => {
    const role = getUserRole();
    return role && role === requiredRole.toLowerCase();
};

/**
 * Check a specific permission key.
 * System admins return true for everything.
 * @param {string} key - Permission key like "leads.all.delete"
 * @param {object} user - User object (from context)
 * @returns {boolean}
 */
export const hasPermission = (key, user) => {
    if (!user) return false;
    const role = user?.data?.role || user?.role;
    if (!role || typeof role !== 'object') return false;
    // System admin bypasses
    if (role.isSystem && role.name?.toLowerCase() === 'admin') return true;
    return Array.isArray(role.permissions) && role.permissions.includes(key);
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
