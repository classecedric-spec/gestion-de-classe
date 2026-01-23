import { describe, it, expect } from 'vitest';
import { calculateBubbleSize, isOverdue } from '../progressionHelpers';

describe('progressionHelpers', () => {
    describe('calculateBubbleSize', () => {
        it('should return default size for 0 students', () => {
            const result = calculateBubbleSize(1000, 500, 0);
            expect(result).toEqual({ cols: 1, bubbleSize: 40 });
        });

        it('should optimize for a square layout', () => {
            // 4 items in 200x200 space -> 2x2 grid ideally
            const result = calculateBubbleSize(200, 200, 4);
            // with 8px gap, available 192/2 = 96
            expect(result.cols).toBe(2);
            expect(result.bubbleSize).toBeGreaterThan(90);
        });

        it('should clamp size to min 30 and max 120', () => {
            // Huge space
            const large = calculateBubbleSize(2000, 2000, 1);
            expect(large.bubbleSize).toBe(120);

            // Tiny space
            const small = calculateBubbleSize(50, 50, 10);
            expect(small.bubbleSize).toBe(30);
        });
    });

    describe('isOverdue', () => {
        const now = new Date('2024-01-15T12:00:00Z');

        it('should return false if module has no deadline', () => {
            const prog = { Activite: { Module: { date_fin: null } } };
            expect(isOverdue(prog, now)).toBe(false);
        });

        it('should return false if progression is finished', () => {
            const prog = {
                etat: 'termine',
                Activite: {
                    Module: {
                        date_fin: '2024-01-01',
                        etat_module: 'en_cours'
                    }
                }
            };
            expect(isOverdue(prog, now)).toBe(false);
        });

        it('should return true if deadline passed, module active and not finished', () => {
            const prog = {
                etat: 'en_cours',
                Activite: {
                    Module: {
                        date_fin: '2024-01-01', // passed
                        etat_module: 'en_cours'
                    }
                }
            };
            expect(isOverdue(prog, now)).toBe(true);
        });

        it('should return false if deadline is in the future', () => {
            const prog = {
                etat: 'en_cours',
                Activite: {
                    Module: {
                        date_fin: '2024-02-01', // future
                        etat_module: 'en_cours'
                    }
                }
            };
            expect(isOverdue(prog, now)).toBe(false);
        });
    });
});
