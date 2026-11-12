import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('shap_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          const data = res.data.data || res.data;
          setUser(data.user);
          setProfile(data.profile || null);
        }
      } catch (err) {
        console.error('Failed to load authenticated user profile', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = async (identifierOrEmail, password) => {
    const res = await api.post('/auth/login', {
      identifier: identifierOrEmail,
      email: identifierOrEmail,
      phone: identifierOrEmail,
      password,
    });
    if (res.data.success) {
      const data = res.data.data || res.data;
      const newToken = data.token;
      const newRefreshToken = data.refreshToken;
      const newUser = data.user;
      const newProfile = data.profile || null;
      localStorage.setItem('shap_token', newToken);
      if (newRefreshToken) {
        localStorage.setItem('shap_refresh_token', newRefreshToken);
      }
      localStorage.setItem('shap_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      setProfile(newProfile);
      return newUser;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    if (res.data.success) {
      const data = res.data.data || res.data;
      const newToken = data.token;
      const newRefreshToken = data.refreshToken;
      const newUser = data.user;
      const newProfile = data.profile || null;
      localStorage.setItem('shap_token', newToken);
      if (newRefreshToken) {
        localStorage.setItem('shap_refresh_token', newRefreshToken);
      }
      localStorage.setItem('shap_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      setProfile(newProfile);
      return newUser;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('shap_refresh_token');
      await api.post('/auth/logout', { refreshToken }).catch(() => {});
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('shap_token');
      localStorage.removeItem('shap_refresh_token');
      localStorage.removeItem('shap_user');
      setToken(null);
      setUser(null);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        const data = res.data.data || res.data;
        setUser(data.user);
        setProfile(data.profile || null);
      }
    } catch (err) {
      console.error('Error refreshing profile', err);
    }
  };

  const updateUser = (newUserData) => {
    setUser(newUserData);
    localStorage.setItem('shap_user', JSON.stringify(newUserData));
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, token, loading, login, register, logout, refreshProfile, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
