import React, { useState } from 'react';
import { Play, Clock } from 'lucide-react';
import clsx from 'clsx';
import { Modal, Button } from '../core';

interface TimerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (duration: number, message: string) => void;
}

const TimerModal: React.FC<TimerModalProps> = ({ isOpen, onClose, onStart }) => {
    const [minutes, setMinutes] = useState(5);
    const [message, setMessage] = useState('');

    const presets = [5, 10, 15, 20, 30, 45, 60];

    const handleStart = () => {
        if (minutes > 0) {
            onStart(minutes * 60, message);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Minuteur"
            icon={<Clock size={24} />}
            className="max-w-sm"
            footer={
                <>
                    <Button onClick={onClose} variant="secondary" className="flex-1">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleStart}
                        className="flex-1"
                        icon={Play}
                    >
                        Démarrer
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-grey-medium">Label (Optionnel)</label>
                    <input
                        type="text"
                        placeholder="Ex: Examen, Lecture..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full bg-background/50 border border-border/10 rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary transition-colors placeholder:text-grey-dark"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-grey-medium">Durée (minutes)</label>
                    <input
                        type="number"
                        min="1"
                        max="180"
                        value={minutes}
                        onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                        className="w-full bg-background/50 border border-border/10 rounded-xl px-4 py-3 text-2xl font-bold text-center text-text-main focus:outline-none focus:border-primary transition-colors"
                    />
                </div>

                <div className="grid grid-cols-4 gap-2">
                    {presets.map(min => (
                        <button
                            key={min}
                            onClick={() => setMinutes(min)}
                            className={clsx(
                                "py-2 rounded-lg text-sm font-medium transition-all border",
                                minutes === min
                                    ? "bg-primary text-text-dark border-primary"
                                    : "bg-input border-border/5 text-grey-medium hover:bg-input/80 hover:text-text-main"
                            )}
                        >
                            {min}m
                        </button>
                    ))}
                </div>
            </div>
        </Modal>
    );
};

export default TimerModal;
