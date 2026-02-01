import React from 'react';
import { ArrowRight } from 'lucide-react';

import { useDatabaseStatus } from '../hooks/useDatabaseStatus';
import { useAuthForm } from '../hooks/useAuthForm';
import { useAuthAction } from '../hooks/useAuthAction';

import { DatabaseStatusAlert } from '../components/auth/DatabaseStatusAlert';
import { AuthHeader } from '../components/auth/AuthHeader';
import { AuthFooter } from '../components/auth/AuthFooter';
import { AuthFormFields } from '../components/auth/AuthFormFields';
import { Button } from '../core';

const Auth: React.FC = () => {
    // Hooks
    const { dbStatus } = useDatabaseStatus();
    const {
        email, setEmail,
        password, setPassword,
        fullName, setFullName,
        showPassword, setShowPassword,
        rememberMe, setRememberMe,
        mode, toggleMode
    } = useAuthForm();
    const {
        executeAuth,
        loading,
        error,
        message,
        clearError,
        clearMessage
    } = useAuthAction();

    // Handlers
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await executeAuth(mode, {
            email,
            password,
            fullName,
            rememberMe
        });
    };

    const handleSwitchMode = (newMode: any) => {
        toggleMode(newMode);
        clearError();
        clearMessage();
    };

    const handleForgotPassword = () => {
        toggleMode('FORGOT');
        clearError();
        clearMessage();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden relative selection:bg-primary/30 selection:text-white">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -z-10"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] -z-10"></div>

            <div className="w-full max-w-[420px] relative z-10 perspective-1000">
                <div className="bg-surface/60 backdrop-blur-2xl border border-white/10 p-10 rounded-[2rem] shadow-2xl hover:shadow-[0_0_50px_rgba(217,185,129,0.15)] transition-shadow duration-500">

                    {/* Header */}
                    <AuthHeader mode={mode} />

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Database Status Warning */}
                        <DatabaseStatusAlert dbStatus={dbStatus} />

                        {/* Form Fields */}
                        <AuthFormFields
                            mode={mode}
                            formData={{ email, password, fullName, showPassword, rememberMe }}
                            setters={{
                                setEmail,
                                setPassword,
                                setFullName,
                                setShowPassword,
                                setRememberMe,
                                onForgotPassword: handleForgotPassword
                            }}
                        />

                        {/* Messages */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex gap-2 animate-in fade-in slide-in-from-top-1 font-medium">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        {message && (
                            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-3 rounded-xl flex gap-2 animate-in fade-in slide-in-from-top-1 font-medium">
                                <span>✅</span> {message}
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            loading={loading}
                            variant="primary"
                            className="w-full mt-4"
                            iconRight={ArrowRight}
                        >
                            <span className="text-xs uppercase tracking-widest font-black">
                                {mode === 'FORGOT' ? "Réinitialiser" : (mode === 'SIGNUP' ? "Commencer maintenant" : 'Accéder au Dashboard')}
                            </span>
                        </Button>
                    </form>

                    {/* Footer */}
                    <AuthFooter mode={mode} onSwitchMode={handleSwitchMode} />
                </div>
            </div>
        </div>
    );
};

export default Auth;
