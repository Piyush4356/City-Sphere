import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { KeyRound, Loader2, ArrowRight, RefreshCw } from 'lucide-react';

const VerifyOTP = () => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Timer state
    const [timeLeft, setTimeLeft] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [isResending, setIsResending] = useState(false);

    const { verifyOTP, resendOTP } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email;

    useEffect(() => {
        if (!email) {
            navigate('/login');
        }
    }, [email, navigate]);

    // Timer effect
    useEffect(() => {
        if (timeLeft > 0) {
            const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timerId);
        } else {
            setCanResend(true);
        }
    }, [timeLeft]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setIsSubmitting(true);

        try {
            await verifyOTP(email, otp);
            navigate('/');
        } catch (err) {
            setError(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;

        setError('');
        setSuccessMsg('');
        setIsResending(true);

        try {
            await resendOTP(email);
            setSuccessMsg('A new code has been sent to your email.');
            setTimeLeft(60);
            setCanResend(false);
            setOtp(''); // clear old code
        } catch (err) {
            setError(err);
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-10 transform transition-all">

                <div className="text-center mb-8">
                    <div className="bg-civic-100 text-civic-500 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                        <KeyRound className="h-8 w-8" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Check your email</h2>
                    <p className="mt-3 text-sm text-gray-500">
                        We've sent a 6-digit secure code to <br />
                        <span className="font-semibold text-gray-800">{email}</span>
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md">
                        <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                )}

                {successMsg && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-md">
                        <p className="text-sm text-green-700 font-medium">{successMsg}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <div className="relative mt-1">
                            <input
                                type="text"
                                required
                                maxLength="6"
                                className="appearance-none block w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-0 focus:border-civic-500 transition-colors text-center text-3xl font-bold tracking-[0.5em] text-gray-900 bg-gray-50 uppercase shadow-inner"
                                placeholder="------"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || otp.length < 6}
                        className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-civic-500 hover:bg-civic-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-civic-200 transition-all shadow-md disabled:bg-civic-300 disabled:cursor-not-allowed overflow-hidden"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Verifying...
                            </span>
                        ) : (
                            <span className="flex items-center">
                                Verify Account
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-gray-100 pt-6">
                    <p className="text-sm text-gray-500 mb-3">Didn't receive the code?</p>

                    <button
                        onClick={handleResend}
                        disabled={!canResend || isResending}
                        className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${canResend
                                ? 'text-civic-500 bg-civic-50 hover:bg-civic-100 hover:text-civic-600 cursor-pointer'
                                : 'text-gray-400 bg-gray-50 cursor-not-allowed'
                            }`}
                    >
                        {isResending ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                        ) : canResend ? (
                            <><RefreshCw className="w-4 h-4 mr-2" /> Resend Code</>
                        ) : (
                            `Resend code in 00:${timeLeft < 10 ? `0${timeLeft}` : timeLeft}`
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default VerifyOTP;
