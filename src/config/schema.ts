export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateConfig(raw: unknown): ValidationResult {
    const errors: string[] = [];

    if (typeof raw !== 'object' || raw === null) {
        return { valid: false, errors: ['Config must be a JSON object'] };
    }

    const config = raw as Record<string, unknown>;

    if (config.checks !== undefined && typeof config.checks !== 'object') {
        errors.push('"checks" must be an object');
    }

    if (config.severity !== undefined && typeof config.severity !== 'object') {
        errors.push('"severity" must be an object');
    }

    if (config.output !== undefined && typeof config.output !== 'object') {
        errors.push('"output" must be an object');
    }

    if (config.allowlist !== undefined && typeof config.allowlist !== 'object') {
        errors.push('"allowlist" must be an object');
    }

    return { valid: errors.length === 0, errors };
}
