import { describe, it, expect } from 'vitest';
import { deriveRiskClassification } from '../../../src/hub/types/hub.js';

describe('deriveRiskClassification', () => {
    it('classifies scores 0-39 as critical', () => {
        expect(deriveRiskClassification(0)).toBe('critical');
        expect(deriveRiskClassification(20)).toBe('critical');
        expect(deriveRiskClassification(39)).toBe('critical');
    });

    it('classifies scores 40-59 as high', () => {
        expect(deriveRiskClassification(40)).toBe('high');
        expect(deriveRiskClassification(50)).toBe('high');
        expect(deriveRiskClassification(59)).toBe('high');
    });

    it('classifies scores 60-79 as medium', () => {
        expect(deriveRiskClassification(60)).toBe('medium');
        expect(deriveRiskClassification(70)).toBe('medium');
        expect(deriveRiskClassification(79)).toBe('medium');
    });

    it('classifies scores 80-100 as low', () => {
        expect(deriveRiskClassification(80)).toBe('low');
        expect(deriveRiskClassification(90)).toBe('low');
        expect(deriveRiskClassification(100)).toBe('low');
    });
});
