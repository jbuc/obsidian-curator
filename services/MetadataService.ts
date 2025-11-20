import { TFile, CachedMetadata, getAllTags, App } from 'obsidian';

const METADATA_CACHE_COOLDOWN_MS = 1_000;
const METADATA_RETENTION_MS = 30 * 60 * 1_000; // 30 minutes
const METADATA_CACHE_RATIO = 0.5; // max 50% of vault markdown file count

export class MetadataService {
    private metadataFingerprints = new Map<
        string,
        {
            hash: string;
            updatedAt: number;
        }
    >();
    private ignoreUntil: Map<string, number> = new Map();

    constructor(private app: App) { }

    shouldIgnore(file: TFile): boolean {
        const now = Date.now();
        const skipUntil = this.ignoreUntil.get(file.path);
        return !!(skipUntil && skipUntil > now);
    }

    setIgnoreCooldown(file: TFile) {
        const cooldownMs = METADATA_CACHE_COOLDOWN_MS;
        this.ignoreUntil.set(file.path, Date.now() + cooldownMs);
        window.setTimeout(() => this.ignoreUntil.delete(file.path), cooldownMs * 2);
    }

    hasMetadataChanged(file: TFile, fileCache: CachedMetadata | null, caller?: string): boolean {
        const now = Date.now();
        const metadataHash = this.computeMetadataFingerprint(file, fileCache);

        if (metadataHash) {
            const previous = this.metadataFingerprints.get(file.path);
            if (caller !== 'cmd' && previous?.hash === metadataHash) {
                return false;
            }
            this.metadataFingerprints.set(file.path, { hash: metadataHash, updatedAt: now });
            this.pruneMetadataFingerprints(now);
        }
        return true;
    }

    refresh() {
        this.metadataFingerprints.clear();
        this.ignoreUntil.clear();
    }

    private computeMetadataFingerprint(file: TFile, fileCache: CachedMetadata | null): string | null {
        if (!fileCache) return null;
        const safeFrontmatter = (() => {
            const fm = fileCache.frontmatter;
            if (!fm) return null;
            const clone: Record<string, unknown> = {};
            Object.entries(fm).forEach(([key, value]) => {
                if (key === 'position') return;
                clone[key] = value;
            });
            return clone;
        })();
        const tags = getAllTags(fileCache) ?? [];
        const info = {
            path: file.path,
            name: file.basename,
            folder: file.parent?.path ?? '',
            extension: file.extension,
        };
        const payload = {
            info,
            fm: safeFrontmatter,
            tags,
        };
        try {
            return JSON.stringify(payload);
        } catch (error) {
            console.warn('[Auto Note Mover] Failed to hash metadata for fingerprinting', error);
            return null;
        }
    }

    private pruneMetadataFingerprints(now: number) {
        const files = this.app.vault.getMarkdownFiles();
        const limit = Math.max(100, Math.floor(files.length * METADATA_CACHE_RATIO));
        const cutoff = now - METADATA_RETENTION_MS;

        for (const [path, entry] of this.metadataFingerprints.entries()) {
            if (entry.updatedAt < cutoff) {
                this.metadataFingerprints.delete(path);
            }
        }

        if (this.metadataFingerprints.size <= limit) {
            return;
        }

        const sorted = Array.from(this.metadataFingerprints.entries()).sort(
            (a, b) => a[1].updatedAt - b[1].updatedAt
        );
        while (this.metadataFingerprints.size > limit && sorted.length) {
            const [path] = sorted.shift()!;
            this.metadataFingerprints.delete(path);
        }
    }
}
