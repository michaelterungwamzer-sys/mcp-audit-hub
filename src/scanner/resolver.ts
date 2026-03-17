import { readFile, stat, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import fg from 'fast-glob';

export interface ResolverResult {
    root: string;
    targetType: 'local' | 'npm';
    sourceFiles: string[];
    packageJson?: Record<string, unknown>;
}

const tempDirs = new Set<string>();

function registerCleanup(): void {
    const cleanup = async () => {
        for (const dir of tempDirs) {
            try {
                await rm(dir, { recursive: true, force: true });
            } catch {
                // Best-effort cleanup
            }
        }
        tempDirs.clear();
    };

    process.on('exit', () => {
        for (const dir of tempDirs) {
            try {
                // Sync cleanup on exit
                const { rmSync } = require('node:fs');
                rmSync(dir, { recursive: true, force: true });
            } catch {
                // Best-effort
            }
        }
    });

    process.on('SIGINT', async () => {
        await cleanup();
        process.exit(130);
    });

    process.on('SIGTERM', async () => {
        await cleanup();
        process.exit(143);
    });
}

let cleanupRegistered = false;

function ensureCleanup(): void {
    if (!cleanupRegistered) {
        registerCleanup();
        cleanupRegistered = true;
    }
}

function isLocalPath(target: string): boolean {
    return (
        target.startsWith('.') ||
        target.startsWith('/') ||
        target.startsWith('~') ||
        /^[a-zA-Z]:[\\/]/.test(target)
    );
}

async function resolveLocal(dirPath: string): Promise<ResolverResult> {
    const dirStat = await stat(dirPath);

    if (!dirStat.isDirectory()) {
        throw new Error(`Target is not a directory: ${dirPath}`);
    }

    const sourceFiles = await fg(
        ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.mjs'],
        {
            cwd: dirPath,
            ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/build/**'],
            absolute: true,
        },
    );

    let packageJson: Record<string, unknown> | undefined;

    try {
        const raw = await readFile(join(dirPath, 'package.json'), 'utf-8');
        packageJson = JSON.parse(raw);
    } catch {
        // No package.json — not an error
    }

    return {
        root: dirPath,
        targetType: 'local',
        sourceFiles,
        packageJson,
    };
}

const sessionCache = new Map<string, ResolverResult>();

async function resolveNpm(packageName: string): Promise<ResolverResult> {
    const cached = sessionCache.get(packageName);
    if (cached) return cached;

    ensureCleanup();

    const metaUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
    const metaResponse = await fetch(metaUrl);

    if (!metaResponse.ok) {
        throw new Error(
            `Package not found on npm: ${packageName} (HTTP ${metaResponse.status})`,
        );
    }

    const meta = (await metaResponse.json()) as Record<string, unknown>;
    const distTags = meta['dist-tags'] as Record<string, string> | undefined;
    const latestVersion = distTags?.latest;

    if (!latestVersion) {
        throw new Error(`No latest version found for ${packageName}`);
    }

    const versions = meta.versions as Record<string, Record<string, unknown>> | undefined;
    const versionMeta = versions?.[latestVersion];
    const dist = versionMeta?.dist as Record<string, string> | undefined;
    const tarballUrl = dist?.tarball;

    if (!tarballUrl) {
        throw new Error(`No tarball URL found for ${packageName}@${latestVersion}`);
    }

    const tempDir = await mkdtemp(join(tmpdir(), 'mcp-audit-'));
    tempDirs.add(tempDir);

    const tarballResponse = await fetch(tarballUrl);
    if (!tarballResponse.ok) {
        throw new Error(`Failed to download tarball for ${packageName}`);
    }

    const buffer = Buffer.from(await tarballResponse.arrayBuffer());

    // Extract tarball using node:zlib + manual tar parsing
    const { gunzipSync } = await import('node:zlib');
    const { writeFile, mkdir } = await import('node:fs/promises');

    const extractedDir = join(tempDir, 'extracted');
    await mkdir(extractedDir, { recursive: true });

    // Gunzip the tarball
    const tarBuffer = gunzipSync(buffer);

    // Parse tar format (512-byte header blocks)
    let offset = 0;
    while (offset < tarBuffer.length - 512) {
        const header = tarBuffer.subarray(offset, offset + 512);

        // Check for empty block (end of archive)
        if (header.every((b) => b === 0)) break;

        // Extract filename (bytes 0-99)
        const rawName = header.subarray(0, 100).toString('utf-8').replace(/\0/g, '');

        // Extract file size (bytes 124-135, octal)
        const sizeStr = header.subarray(124, 136).toString('utf-8').replace(/\0/g, '').trim();
        const fileSize = parseInt(sizeStr, 8) || 0;

        // Extract type flag (byte 156)
        const typeFlag = String.fromCharCode(header[156]);

        offset += 512; // Move past header

        if (rawName && fileSize > 0 && (typeFlag === '0' || typeFlag === '\0')) {
            // Regular file — strip leading 'package/' prefix
            const filePath = rawName.startsWith('package/')
                ? rawName.slice('package/'.length)
                : rawName;

            const fullPath = join(extractedDir, 'package', filePath);
            const dir = fullPath.substring(0, fullPath.lastIndexOf('/') > 0 ? fullPath.lastIndexOf('/') : fullPath.lastIndexOf('\\'));

            await mkdir(dir, { recursive: true });
            await writeFile(fullPath, tarBuffer.subarray(offset, offset + fileSize));
        }

        // Move to next 512-byte boundary
        offset += Math.ceil(fileSize / 512) * 512;
    }

    const extractedRoot = join(extractedDir, 'package');

    const result = await resolveLocal(extractedRoot);
    const npmResult: ResolverResult = { ...result, targetType: 'npm' };

    sessionCache.set(packageName, npmResult);
    return npmResult;
}

export async function resolveTarget(target: string): Promise<ResolverResult> {
    if (isLocalPath(target)) {
        return resolveLocal(target);
    }

    return resolveNpm(target);
}

export async function cleanupTempDirs(): Promise<void> {
    for (const dir of tempDirs) {
        try {
            await rm(dir, { recursive: true, force: true });
        } catch {
            // Best-effort
        }
    }
    tempDirs.clear();
}
