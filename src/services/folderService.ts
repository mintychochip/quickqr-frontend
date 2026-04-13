/**
 * Folder Service
 * Handles folder and tag management for QR code organization
 */
import { supabase } from '../config/supabase';

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon?: string;
  qr_count?: number;
  created_at?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  qr_count?: number;
}

export interface FolderResult {
  success: boolean;
  data?: Folder | Folder[];
  error?: string;
}

export interface TagResult {
  success: boolean;
  data?: Tag | Tag[];
  error?: string;
}

/**
 * Fetch all folders for the current user with QR counts
 */
export async function fetchUserFolders(): Promise<FolderResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    // Load folders
    const { data: folders, error: folderError } = await supabase
      .from('qr_folders')
      .select('*')
      .eq('user_id', session.user.id)
      .order('name');

    if (folderError) {
      return { success: false, error: folderError.message };
    }

    // Get QR counts for each folder
    const foldersWithCounts = await Promise.all(
      (folders || []).map(async (folder) => {
        const { count } = await supabase
          .from('qrcodes')
          .select('*', { count: 'exact', head: true })
          .eq('folder_id', folder.id);
        return { ...folder, qr_count: count || 0 };
      })
    );

    return { success: true, data: foldersWithCounts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Create a new folder
 */
export async function createFolder(name: string, color: string = '#14b8a6'): Promise<FolderResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!name.trim()) {
      return { success: false, error: 'Folder name is required' };
    }

    const { data, error } = await supabase
      .from('qr_folders')
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        color,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: { ...data, qr_count: 0 } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Update an existing folder
 */
export async function updateFolder(
  folderId: string,
  updates: { name?: string; color?: string }
): Promise<FolderResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    if (updates.name !== undefined && !updates.name.trim()) {
      return { success: false, error: 'Folder name cannot be empty' };
    }

    const { data, error } = await supabase
      .from('qr_folders')
      .update({
        ...(updates.name && { name: updates.name.trim() }),
        ...(updates.color && { color: updates.color }),
      })
      .eq('id', folderId)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Folder not found or access denied' };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Delete a folder
 */
export async function deleteFolder(folderId: string): Promise<FolderResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    // First, remove folder_id from all QR codes in this folder
    const { error: updateError } = await supabase
      .from('qrcodes')
      .update({ folder_id: null })
      .eq('folder_id', folderId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Then delete the folder
    const { error } = await supabase
      .from('qr_folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', session.user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Move a QR code to a different folder
 */
export async function moveQRToFolder(qrId: string, folderId: string | null): Promise<FolderResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify QR code ownership
    const { data: qrData, error: qrError } = await supabase
      .from('qrcodes')
      .select('id')
      .eq('id', qrId)
      .eq('user_id', session.user.id)
      .single();

    if (qrError || !qrData) {
      return { success: false, error: 'QR code not found or access denied' };
    }

    // If folderId provided, verify folder ownership
    if (folderId) {
      const { data: folderData, error: folderError } = await supabase
        .from('qr_folders')
        .select('id')
        .eq('id', folderId)
        .eq('user_id', session.user.id)
        .single();

      if (folderError || !folderData) {
        return { success: false, error: 'Folder not found or access denied' };
      }
    }

    // Update the QR code
    const { error } = await supabase
      .from('qrcodes')
      .update({ folder_id: folderId })
      .eq('id', qrId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Fetch all tags for the current user with QR counts
 */
export async function fetchUserTags(): Promise<TagResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get all tags from QR codes (stored as JSON array in tags column)
    const { data: qrCodes, error } = await supabase
      .from('qrcodes')
      .select('tags')
      .eq('user_id', session.user.id)
      .not('tags', 'is', null);

    if (error) {
      return { success: false, error: error.message };
    }

    // Extract and count tags
    const tagMap = new Map<string, { name: string; count: number; color: string }>();
    
    (qrCodes || []).forEach((qr) => {
      const tags = qr.tags || [];
      tags.forEach((tagName: string) => {
        const existing = tagMap.get(tagName);
        if (existing) {
          existing.count++;
        } else {
          // Generate a consistent color based on tag name
          const colors = ['#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];
          const colorIndex = tagName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
          tagMap.set(tagName, { name: tagName, count: 1, color: colors[colorIndex] });
        }
      });
    });

    const tags: Tag[] = Array.from(tagMap.entries()).map(([id, tag]) => ({
      id,
      name: tag.name,
      color: tag.color,
      qr_count: tag.count,
    }));

    return { success: true, data: tags.sort((a, b) => a.name.localeCompare(b.name)) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Add a tag to a QR code
 */
export async function addTagToQR(qrId: string, tagName: string): Promise<FolderResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get current tags
    const { data: qrData, error: qrError } = await supabase
      .from('qrcodes')
      .select('tags')
      .eq('id', qrId)
      .eq('user_id', session.user.id)
      .single();

    if (qrError || !qrData) {
      return { success: false, error: 'QR code not found or access denied' };
    }

    const currentTags = qrData.tags || [];
    if (currentTags.includes(tagName)) {
      return { success: true }; // Tag already exists
    }

    const newTags = [...currentTags, tagName];

    const { error } = await supabase
      .from('qrcodes')
      .update({ tags: newTags })
      .eq('id', qrId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Remove a tag from a QR code
 */
export async function removeTagFromQR(qrId: string, tagName: string): Promise<FolderResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get current tags
    const { data: qrData, error: qrError } = await supabase
      .from('qrcodes')
      .select('tags')
      .eq('id', qrId)
      .eq('user_id', session.user.id)
      .single();

    if (qrError || !qrData) {
      return { success: false, error: 'QR code not found or access denied' };
    }

    const currentTags = qrData.tags || [];
    const newTags = currentTags.filter((t: string) => t !== tagName);

    const { error } = await supabase
      .from('qrcodes')
      .update({ tags: newTags })
      .eq('id', qrId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Filter QR codes by folder ID
 */
export function filterQRCodesByFolder(qrCodes: any[], folderId: string | null): any[] {
  if (!folderId) return qrCodes;
  return qrCodes.filter(qr => qr.folder_id === folderId);
}

/**
 * Filter QR codes by tags
 */
export function filterQRCodesByTags(qrCodes: any[], tagNames: string[]): any[] {
  if (!tagNames.length) return qrCodes;
  return qrCodes.filter(qr => {
    const qrTags = qr.tags || [];
    return tagNames.some(tag => qrTags.includes(tag));
  });
}
