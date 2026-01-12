import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader2, Database, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { checkDatabaseSetup, SETUP_SQL } from '../lib/databaseSetup';
import { isMobilePhone } from '../lib/utils';

const Auth = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [dbStatus, setDbStatus] = useState({ checked: false, exists: true, errorType: null, rawError: null });
    const [copied, setCopied] = useState(false);
    const navigate = useNavigate();


    useEffect(() => {
        const checkDB = async () => {
            setDbStatus(prev => ({ ...prev, checked: false }));
            const status = await checkDatabaseSetup();
            setDbStatus({
                checked: true,
                exists: status.exists,
                errorType: status.errorType,
                rawError: status.rawError
            });
        };
        checkDB();

        // Initialize rememberMe from localStorage
        const savedRemember = localStorage.getItem('sb-remember-me') === 'true';
        setRememberMe(savedRemember);
    }, []);

    const copySQL = () => {
        navigator.clipboard.writeText(SETUP_SQL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isForgotPassword) {
                const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/dashboard/settings?tab=profil`,
                });
                if (resetError) throw resetError;
                setMessage('Un lien de réinitialisation a été envoyé à votre adresse email.');
            } else if (isSignUp) {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                    },
                });
                if (signUpError) throw signUpError;
                setMessage('Vérifiez votre boîte mail pour confirmer votre inscription !');
            } else {
                // Set the remember me flag for our custom storage handler in supabaseClient.js
                localStorage.setItem('sb-remember-me', rememberMe ? 'true' : 'false');

                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;

                // Redirect based on device type
                if (isMobilePhone()) {
                    navigate('/mobile-dashboard');
                } else {
                    navigate('/dashboard');
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden relative selection:bg-primary/30 selection:text-white">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -z-10"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] -z-10"></div>

            <div className="w-full max-w-[420px] relative z-10 perspective-1000">
                <div className="bg-surface/60 backdrop-blur-2xl border border-white/10 p-10 rounded-[2rem] shadow-2xl hover:shadow-[0_0_50px_rgba(217,185,129,0.15)] transition-shadow duration-500">

                    {/* Logo/Title */}
                    <div className="text-center mb-10">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center text-text-dark font-black text-xl shadow-lg shadow-primary/20 mx-auto mb-6 transform hover:rotate-12 transition-transform duration-300">
                            G
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                            {isForgotPassword ? 'Récupération' : (isSignUp ? 'Bienvenue' : 'Bon retour')}
                        </h1>
                        <p className="text-grey-medium font-medium text-sm">
                            {isForgotPassword
                                ? 'Un email pour réinitialiser le mot de passe'
                                : (isSignUp ? 'Créez votre espace enseignant' : 'Accédez à votre tableau de bord')}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        {/* Database Status Warning */}
                        {!dbStatus.exists && dbStatus.checked && (
                            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl mb-6 animate-in fade-in zoom-in-95">
                                {dbStatus.errorType === 'API_KEY' ? (
                                    <div className="text-xs text-amber-200">
                                        <div className="font-bold flex items-center gap-2 mb-1"><Database size={12} /> API ERROR</div>
                                        Vérifiez vos clés dans .env.local
                                    </div>
                                ) : (
                                    <div className="text-xs text-grey-medium">
                                        <div className="font-bold text-amber-500 flex items-center gap-2 mb-1"><Database size={12} /> SETUP REQUIS</div>
                                        Table manquante. <button type="button" onClick={copySQL} className="text-primary hover:underline">Copier SQL</button>
                                        <pre className="mt-2 bg-black/40 p-2 rounded text-[10px] overflow-hidden truncate">{SETUP_SQL}</pre>
                                    </div>
                                )}
                            </div>
                        )}

                        {isSignUp && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-grey-dark uppercase tracking-widest ml-1">Nom complet</label>
                                <div className="relative group">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Ex: Jean Dupont"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-grey-dark focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all text-sm font-medium"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-grey-dark uppercase tracking-widest ml-1">Email</label>
                            <div className="relative group">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" />
                                <input
                                    type="email"
                                    placeholder="prof@ecole.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete={rememberMe ? "email" : "off"}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-grey-dark focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all text-sm font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-grey-dark uppercase tracking-widest ml-1">Mot de passe</label>
                            <div className="relative group">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete={rememberMe ? "current-password" : "off"}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-12 text-white placeholder:text-grey-dark focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all text-sm font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-grey-dark hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {!isSignUp && !isForgotPassword && (
                            <div className="flex items-center justify-between px-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-primary border-primary' : 'border-grey-dark bg-transparent'}`}>
                                        {rememberMe && <Check size={10} className="text-text-dark" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="hidden"
                                    />
                                    <span className="text-xs text-grey-medium group-hover:text-white transition-colors">Rester connecté</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => { setIsForgotPassword(true); setError(null); setMessage(null); }}
                                    className="text-xs text-primary font-bold hover:text-white transition-colors"
                                >
                                    Oublié ?
                                </button>
                            </div>
                        )}

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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-text-dark font-black py-4 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    <span className="text-xs uppercase tracking-widest">{isForgotPassword ? "Réinitialiser" : (isSignUp ? "Commencer maintenant" : 'Accéder au Dashboard')}</span>
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-sm text-grey-medium">
                            {isForgotPassword ? (
                                <button onClick={() => { setIsForgotPassword(false); setError(null); setMessage(null); }} className="text-white hover:text-primary font-semibold transition-colors">
                                    ← Retour à la connexion
                                </button>
                            ) : (
                                <>
                                    {isSignUp ? 'Déjà membre ? ' : "Pas encore de compte ? "}
                                    <button
                                        onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
                                        className="text-white hover:text-primary font-bold transition-colors ml-1"
                                    >
                                        {isSignUp ? 'Se connecter' : "S'inscrire"}
                                    </button>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
