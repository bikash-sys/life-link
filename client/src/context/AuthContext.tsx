import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types';
import { MOCK_USER } from '../mock/mockData';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (email?: string, password?: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'lifelink_auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize with MOCK_USER by default so reviewers can immediately see the dashboard,
  // or restore from localStorage if toggled.
  const [user, setUser] = useState<UserProfile | null>(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as UserProfile;
      } catch {
        return MOCK_USER;
      }
    }
    return MOCK_USER;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  /**
   * Temporary mock login method.
   * Real JWT backend authentication endpoint will be wired here in future stage.
   */
  const login = async (email?: string, _password?: string): Promise<boolean> => {
    const newUser: UserProfile = {
      ...MOCK_USER,
      email: email || MOCK_USER.email,
    };
    setUser(newUser);
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

