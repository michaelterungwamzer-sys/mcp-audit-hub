import ora, { type Ora } from 'ora';

export interface Spinner {
    start(): void;
    succeed(text?: string): void;
    fail(text?: string): void;
    update(text: string): void;
    stop(): void;
}

export function createSpinner(text: string, enabled = true): Spinner {
    const spinner: Ora = ora({ text, isEnabled: enabled });

    return {
        start() {
            spinner.start();
        },
        succeed(text?: string) {
            spinner.succeed(text);
        },
        fail(text?: string) {
            spinner.fail(text);
        },
        update(text: string) {
            spinner.text = text;
        },
        stop() {
            spinner.stop();
        },
    };
}
