/**
 * Supabase Storage utility for ebook files.
 *
 * Bucket strategy
 * ───────────────
 *  • One private bucket: `library-ebooks`
 *  • Folder layout:
 *      admin/   → admin-uploaded ebooks
 *      members/ → member-uploaded personal ebooks
 *
 * Access
 * ──────
 *  • All files are served via short-lived signed URLs (1 h default).
 *  • The bucket itself is private – no guessable public URLs.
 *
 * Usage
 * ─────
 *  import { uploadEbook, deleteEbook, getSignedUrl, ensureBucket } from '../utils/storage.js';
 */

import path from 'path';
import supabase from '../db/supabase.js';

export const BUCKET = 'library-ebooks';
const SIGNED_URL_TTL = 60 * 60; // 1 hour in seconds

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** True when the path looks like a Supabase Storage path (not a legacy local path). */
export const isSupabasePath = (filePath) =>
    !!filePath && !filePath.startsWith('/') && !filePath.includes('\\') && !filePath.includes('uploads');

/** Map a file extension to a MIME type multer/browsers understand. */
export const extToMime = (ext) => {
    const e = ext.toLowerCase().replace('.', '');
    if (e === 'pdf')  return 'application/pdf';
    if (e === 'epub') return 'application/epub+zip';
    return 'application/octet-stream';
};

// ─── Bucket bootstrap ────────────────────────────────────────────────────────

/**
 * Called once at server startup.
 * Creates the `library-ebooks` bucket if it doesn't already exist.
 */
export async function ensureBucket() {
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) {
            console.warn('[Storage] Could not list buckets:', error.message);
            return;
        }

        const exists = buckets?.some((b) => b.name === BUCKET);
        if (!exists) {
            const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
                public: false,
                fileSizeLimit: 52_428_800, // 50 MB
                allowedMimeTypes: ['application/pdf', 'application/epub+zip'],
            });
            if (createErr) {
                console.warn('[Storage] Could not create bucket:', createErr.message);
            } else {
                console.log(`[Storage] Bucket "${BUCKET}" created.`);
            }
        }
    } catch (err) {
        console.warn('[Storage] ensureBucket error:', err.message);
    }
}

// ─── Core operations ─────────────────────────────────────────────────────────

/**
 * Upload a file buffer and return the Supabase storage path.
 *
 * @param {Buffer} buffer     Raw file bytes (from multer memory storage)
 * @param {string} originalName  Original filename (used for extension)
 * @param {string} folder     'admin' | 'members' | `members/${memberId}`
 * @returns {Promise<string>}  Storage path, e.g. "admin/1714000000000-abc123.pdf"
 */
export async function uploadEbook(buffer, originalName, folder = 'admin') {
    const ext   = path.extname(originalName).toLowerCase();   // '.pdf'
    const mime  = extToMime(ext);
    const uid   = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const storagePath = `${folder}/${uid}${ext}`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
            contentType: mime,
            upsert: false,
        });

    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return storagePath;
}

/**
 * Delete a file from Supabase Storage.
 * Silently ignores missing files.
 */
export async function deleteEbook(storagePath) {
    if (!storagePath || !isSupabasePath(storagePath)) return;

    const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (error) console.warn('[Storage] Delete error:', error.message);
}

/**
 * Generate a short-lived signed URL for a stored ebook.
 *
 * @param {string} storagePath  e.g. "admin/1714000000-abc.pdf"
 * @param {number} [ttl]        Expiry in seconds (default: 1 h)
 * @returns {Promise<string>}   Signed download URL
 */
export async function getSignedUrl(storagePath, ttl = SIGNED_URL_TTL) {
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, ttl);

    if (error) throw new Error(`Signed URL error: ${error.message}`);
    return data.signedUrl;
}
