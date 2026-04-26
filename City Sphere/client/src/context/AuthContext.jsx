import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on app load
        const verifyUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await axios.get(`${API_URL}/api/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setUser(response.data);
                } catch (error) {
                    console.error('Invalid token', error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        verifyUser();
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await axios.post(`${API_URL}/api/auth/login`, { email, password });
            localStorage.setItem('token', data.token);
            setUser(data);
            return true;
        } catch (error) {
            console.error('Login error', error.response?.data || error);
            throw error.response?.data?.message || 'Failed to login';
        }
    };

    const register = async (name, email, password) => {
        try {
            const { data } = await axios.post(`${API_URL}/api/auth/register`, { name, email, password });
            // Do NOT log them in yet. They need to verify OTP.
            return data;
        } catch (error) {
            console.error('Registration error', error.response?.data || error);
            throw error.response?.data?.message || 'Failed to register';
        }
    };

    const verifyOTP = async (email, otp) => {
        try {
            const { data } = await axios.post(`${API_URL}/api/auth/verify-otp`, { email, otp });
            // Now log them in!
            localStorage.setItem('token', data.token);
            setUser(data);
            return true;
        } catch (error) {
            console.error('OTP Verification error', error.response?.data || error);
            throw error.response?.data?.message || 'Failed to verify OTP';
        }
    };

    const resendOTP = async (email) => {
        try {
            const { data } = await axios.post(`${API_URL}/api/auth/resend-otp`, { email });
            return data;
        } catch (error) {
            console.error('Resend OTP error', error.response?.data || error);
            throw error.response?.data?.message || 'Failed to resend OTP';
        }
    };

    const forgotPassword = async (email) => {
        try {
            const { data } = await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
            return data;
        } catch (error) {
            console.error('Forgot password error', error.response?.data || error);
            throw error.response?.data?.message || 'Failed to send reset email';
        }
    };

    const resetPassword = async (token, password) => {
        try {
            const { data } = await axios.put(`${API_URL}/api/auth/reset-password/${token}`, { password });
            return data;
        } catch (error) {
            console.error('Reset password error', error.response?.data || error);
            throw error.response?.data?.message || 'Failed to reset password';
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user, loading, login, register, verifyOTP, resendOTP, forgotPassword, resetPassword, logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};
