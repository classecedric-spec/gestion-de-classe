import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader2, Database, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { checkDatabaseSetup, SETUP_SQL } from '../lib/databaseSetup';

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
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            {/* Decorative blobs */}
            <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-success/20 rounded-full blur-3xl animate-pulse delay-700"></div>

            <div className="w-full max-w-md relative">
                <div className="bg-surface/80 backdrop-blur-xl border border-border/10 p-8 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Logo/Title */}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-text-main mb-2 tracking-tight">
                            Gestion de <span className="text-primary text-4xl leading-none">Classe</span>
                        </h1>
                        <p className="text-grey-medium">
                            {isForgotPassword
                                ? 'Entrez votre email pour réinitialiser votre mot de passe'
                                : (isSignUp ? 'Créez votre compte pour commencer' : 'Bon retour parmi nous !')}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-6">
                        {!dbStatus.exists && dbStatus.checked && (
                            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl mb-6 animate-in fade-in slide-in-from-top-4">
                                {dbStatus.errorType === 'API_KEY' ? (
                                    <>
                                        <div className="flex items-center gap-2 text-danger mb-2 font-bold uppercase text-[10px] tracking-widest">
                                            <Database size={14} />
                                            <span>Erreur de Connexion</span>
                                        </div>
                                        <p className="text-sm text-grey-light mb-4">
                                            Vos clés API Supabase semblent invalides. Veuillez vérifier votre fichier <code className="text-primary">.env.local</code>.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 text-amber-500 mb-2 font-bold uppercase text-[10px] tracking-widest">
                                            <Database size={14} />
                                            <span>Configuration Requise</span>
                                        </div>
                                        <p className="text-xs text-grey-medium mb-3">
                                            La table <code className="text-primary">CompteUtilisateur</code> est absente. Copiez ce SQL dans l'éditeur Supabase :
                                        </p>
                                        <div className="relative group/code mb-4">
                                            <pre className="text-[9px] bg-background/80 p-3 rounded-lg overflow-x-auto text-grey-light border border-border/5 max-h-32">
                                                {SETUP_SQL}
                                            </pre>
                                            <button
                                                onClick={copySQL}
                                                type="button"
                                                className="absolute top-2 right-2 p-1.5 bg-primary text-text-dark rounded-md opacity-0 group-hover/code:opacity-100 transition-opacity hover:scale-105"
                                                title="Copier le SQL"
                                            >
                                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </>
                                )}
                                {dbStatus.rawError && (
                                    <div className="mt-2 text-[10px] text-grey-dark bg-black/20 p-2 rounded border border-border/5 font-mono">
                                        Error {dbStatus.rawError.code || 'unknown'}: {dbStatus.rawError.message}
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        setDbStatus(prev => ({ ...prev, checked: false }));
                                        checkDatabaseSetup().then(status => {
                                            setDbStatus({
                                                checked: true,
                                                exists: status.exists,
                                                errorType: status.errorType,
                                                rawError: status.rawError
                                            });
                                        });
                                    }}
                                    type="button"
                                    className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-grey-light transition-colors border border-border/5"
                                >
                                    Relancer la vérification
                                </button>
                            </div>
                        )}

                        {isSignUp && (
                            <div className="space-y-2">
                                <label htmlFor="full_name" className="text-sm font-medium text-grey-light ml-1">Nom complet</label>
                                <div className="relative group">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors">
                                        <User size={18} />
                                    </span>
                                    <input
                                        id="full_name"
                                        name="full_name"
                                        type="text"
                                        placeholder="Jean Dupont"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                        className="w-full bg-background/80 border border-border/10 rounded-xl py-3 pl-10 pr-4 text-text-main placeholder:text-grey-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-grey-light ml-1">Email</label>
                            <div className="relative group">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors">
                                    <Mail size={18} />
                                </span>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="votre@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete={rememberMe ? "email" : "off"}
                                    className="w-full bg-background/80 border border-border/10 rounded-xl py-3 pl-10 pr-4 text-text-main placeholder:text-grey-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-grey-light ml-1">Mot de passe</label>
                            <div className="relative group">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors">
                                    <Lock size={18} />
                                </span>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete={rememberMe ? "current-password" : "off"}
                                    className="w-full bg-background/80 border border-border/10 rounded-xl py-3 pl-10 pr-12 text-text-main placeholder:text-grey-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium hover:text-text-main transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {!isSignUp && !isForgotPassword && (
                            <div className="flex items-center justify-between ml-1">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="rememberMe"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 rounded border-border/10 bg-background text-primary focus:ring-primary/50 transition-all cursor-pointer"
                                        name="rememberMe"
                                    />
                                    <label htmlFor="rememberMe" className="text-sm text-grey-medium cursor-pointer hover:text-grey-light transition-colors">
                                        Connexion auto.
                                    </label>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsForgotPassword(true);
                                        setError(null);
                                        setMessage(null);
                                    }}
                                    className="text-xs text-primary hover:text-white transition-colors"
                                >
                                    Mot de passe oublié ?
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="bg-danger/10 border border-danger/20 text-danger text-sm p-3 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                                <p>{error}</p>
                            </div>
                        )}

                        {message && (
                            <div className="bg-success/10 border border-success/20 text-success text-sm p-3 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                                <p>{message}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-text-dark font-bold py-3 px-6 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    {isForgotPassword ? "Réinitialiser" : (isSignUp ? "S'inscrire" : 'Se connecter')}
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-border/5 text-center">
                        <p className="text-grey-medium">
                            {isForgotPassword ? (
                                <button
                                    onClick={() => {
                                        setIsForgotPassword(false);
                                        setError(null);
                                        setMessage(null);
                                    }}
                                    className="text-primary hover:text-primary/80 font-semibold transition-colors focus:outline-none underline decoration-primary/30 underline-offset-4"
                                >
                                    Retour à la connexion
                                </button>
                            ) : (
                                <>
                                    {isSignUp ? 'Vous avez déjà un compte ?' : "Vous n'avez pas de compte ?"}
                                    <button
                                        onClick={() => {
                                            setIsSignUp(!isSignUp);
                                            setError(null);
                                            setMessage(null);
                                        }}
                                        className="ml-2 text-primary hover:text-primary/80 font-semibold transition-colors focus:outline-none underline decoration-primary/30 underline-offset-4"
                                    >
                                        {isSignUp ? 'Connectez-vous' : 'Inscrivez-vous'}
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
