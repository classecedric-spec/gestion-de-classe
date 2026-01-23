import React from 'react';
import { Mail, Lock, User, Eye, EyeOff, Check } from 'lucide-react';
import { AuthMode } from '../../hooks/useAuthForm';

interface AuthFormFieldsProps {
    mode: AuthMode;
    formData: {
        email: string;
        password?: string;
        fullName?: string;
        showPassword?: boolean;
        rememberMe?: boolean;
    };
    setters: {
        setEmail: (value: string) => void;
        setPassword: (value: string) => void;
        setFullName: (value: string) => void;
        setShowPassword: (value: boolean) => void;
        setRememberMe: (value: boolean) => void;
        onForgotPassword: () => void;
    };
}

export const AuthFormFields: React.FC<AuthFormFieldsProps> = ({
    mode,
    formData,
    setters
}) => {
    return (
        <>
            {mode === 'SIGNUP' && (
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-grey-dark uppercase tracking-widest ml-1">Nom complet</label>
                    <div className="relative group">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Ex: Jean Dupont"
                            value={formData.fullName}
                            onChange={(e) => setters.setFullName(e.target.value)}
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
                        value={formData.email}
                        onChange={(e) => setters.setEmail(e.target.value)}
                        required
                        autoComplete={formData.rememberMe ? "email" : "off"}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-grey-dark focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all text-sm font-medium"
                    />
                </div>
            </div>

            {mode !== 'FORGOT' && (
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-grey-dark uppercase tracking-widest ml-1">Mot de passe</label>
                    <div className="relative group">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" />
                        <input
                            type={formData.showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setters.setPassword(e.target.value)}
                            required
                            autoComplete={formData.rememberMe ? "current-password" : "off"}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-12 text-white placeholder:text-grey-dark focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all text-sm font-medium"
                        />
                        <button
                            type="button"
                            onClick={() => setters.setShowPassword(!formData.showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-grey-dark hover:text-white transition-colors"
                        >
                            {formData.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
            )}

            {mode === 'LOGIN' && (
                <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${formData.rememberMe ? 'bg-primary border-primary' : 'border-grey-dark bg-transparent'}`}>
                            {formData.rememberMe && <Check size={10} className="text-text-dark" />}
                        </div>
                        <input
                            type="checkbox"
                            checked={formData.rememberMe}
                            onChange={(e) => setters.setRememberMe(e.target.checked)}
                            className="hidden"
                        />
                        <span className="text-xs text-grey-medium group-hover:text-white transition-colors">Rester connecté</span>
                    </label>
                    <button
                        type="button"
                        onClick={setters.onForgotPassword}
                        className="text-xs text-primary font-bold hover:text-white transition-colors"
                    >
                        Oublié ?
                    </button>
                </div>
            )}
        </>
    );
};
