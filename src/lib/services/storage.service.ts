import { SupabaseClient } from "@supabase/supabase-js";

export type CmsBucketId =
  | "cms-banners"
  | "lecture-thumbnails"
  | "cms-assets"
  | "study-materials";

export class StorageService {
  /**
   * Generates a deterministic entity-scoped storage path.
   * Format: {authorId}/{entityId}/{sanitizedFilename}
   */
  static generateScopedPath(
    authorId: string,
    entityId: string,
    filename: string
  ): string {
    const cleanFilename = this.sanitizeFileName(filename);
    return `${authorId}/${entityId}/${cleanFilename}`;
  }

  /**
   * Sanitizes a file name for safe storage path creation.
   */
  static sanitizeFileName(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Generates a secure, temporary signed download URL for private bucket objects.
   * Respects caller's RLS permissions in Supabase.
   */
  static async getSignedUrl(
    supabase: SupabaseClient,
    bucket: CmsBucketId,
    path: string,
    expiresInSeconds = 3600
  ): Promise<{ signedUrl: string | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresInSeconds);

      if (error) throw new Error(error.message);
      return { signedUrl: data?.signedUrl || null, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { signedUrl: null, error };
    }
  }

  /**
   * Gets public URL for public bucket assets (e.g. cms-banners).
   */
  static getPublicUrl(
    supabase: SupabaseClient,
    bucket: CmsBucketId,
    path: string
  ): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
