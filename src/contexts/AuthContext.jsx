import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../utils/api';

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
                            localStorage.setItem('role', parsedUser.role);
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
                    if (userData.role) {
                        localStorage.setItem('role', userData.role);
                    }
                }
            } catch (error) {
                console.error('Failed to load user:', error);
                // Don't clear data on API error - user might be offline
                // Only clear if localStorage data is invalid
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
            if (userData.role) {
                localStorage.setItem('role', userData.role);
            }
        } else {
            localStorage.removeItem('user');
            localStorage.removeItem('role');
        }
    };

    const value = {
        user,
        loading,
        setUser: updateUser,
        // Check both user.role and user.data.role for nested structure
        isAdmin: (() => {
            const role = user?.data?.role || user?.role;
            return role && ['admin', 'superadmin', 'owner'].includes(role.toLowerCase());
        })(),
        isCaller: (() => {
            const role = user?.data?.role || user?.role;
            return role && role.toLowerCase() === 'caller';
        })(),
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
