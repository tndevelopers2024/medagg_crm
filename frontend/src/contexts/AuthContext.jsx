import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../utils/api';
import { getRoleName } from '../utils/roleUtils';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            try {
                // First, try to get user from localStorage
                const storedUser = localStorage.getItem('user');
                const storedRole = localStorage.getItem('role');

                if (storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        setUser(parsedUser);

                        // If role not in separate key, store it now
                        if (parsedUser.role && !storedRole) {
                            const roleName = getRoleName(parsedUser.data?.role || parsedUser.role);
                            if (roleName) localStorage.setItem('role', roleName);
                        }
                    } catch (e) {
                        console.error('Failed to parse stored user:', e);
                    }
                }

                // Then fetch fresh data from API
                const userData = await getMe();
                setUser(userData);

                // Store in localStorage for persistence
                if (userData) {
                    localStorage.setItem('user', JSON.stringify(userData));
                    const role = userData?.data?.role || userData?.role;
                    const roleName = getRoleName(role);
                    if (roleName) {
                        localStorage.setItem('role', roleName);
                    }
                }
            } catch (error) {
                console.error('Failed to load user:', error);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    // Update localStorage when user changes
    const updateUser = (userData) => {
        setUser(userData);
        if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
            const role = userData?.data?.role || userData?.role;
            const roleName = getRoleName(role);
            if (roleName) {
                localStorage.setItem('role', roleName);
            }
        } else {
            localStorage.removeItem('user');
            localStorage.removeItem('role');
        }
    };

    // Extract role info — handles both string and object
    const rawRole = user?.data?.role || user?.role;
    const roleName = getRoleName(rawRole);
    const roleDoc = rawRole && typeof rawRole === 'object' ? rawRole : null;
    const permissions = roleDoc?.permissions || [];
    const isSystemAdmin = !!(roleDoc?.isSystem && roleName === 'admin');

    const hasPermission = useCallback(
        (key) => {
            if (isSystemAdmin) return true;
            return permissions.includes(key);
        },
        [isSystemAdmin, permissions]
    );

    const value = {
        user,
        loading,
        setUser: updateUser,
        isAdmin: ['admin', 'superadmin', 'owner'].includes(roleName),
        isCaller: roleName === 'caller',
        roleName,
        permissions,
        isSystemAdmin,
        hasPermission,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
