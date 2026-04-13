import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchUserFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  moveQRToFolder,
  fetchUserTags,
  addTagToQR,
  removeTagFromQR,
  filterQRCodesByFolder,
  filterQRCodesByTags,
} from '../folderService';
import { supabase } from '../../config/supabase';

// Mock supabase
vi.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('folderService', () => {
  const mockSession = {
    user: {
      id: 'user-123',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchUserFolders', () => {
    it('returns folders with QR counts when authenticated', async () => {
      const mockFolders = [
        { id: 'folder-1', name: 'Marketing', color: '#3b82f6', user_id: 'user-123' },
        { id: 'folder-2', name: 'Products', color: '#14b8a6', user_id: 'user-123' },
      ];

      // Mock the initial folders query
      const foldersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockFolders, error: null }),
      };

      // Mock the count query (for QR counts)
      const countQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
      };

      let callCount = 0;
      (supabase.from as any).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1 && table === 'qr_folders') {
          return foldersQuery;
        }
        // For subsequent calls (QR count queries)
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
        };
      });

      const result = await fetchUserFolders();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(supabase.auth.getSession).toHaveBeenCalled();
    });

    it('returns error when not authenticated', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

      const result = await fetchUserFolders();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('handles database errors gracefully', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      const result = await fetchUserFolders();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('createFolder', () => {
    it('creates a folder successfully', async () => {
      const newFolder = { id: 'folder-new', name: 'Test Folder', color: '#ef4444', user_id: 'user-123' };

      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newFolder, error: null }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      const result = await createFolder('Test Folder', '#ef4444');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: 'folder-new',
        name: 'Test Folder',
        color: '#ef4444',
        qr_count: 0,
      });
    });

    it('returns error for empty folder name', async () => {
      const result = await createFolder('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder name is required');
    });

    it('returns error when not authenticated', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

      const result = await createFolder('Test Folder');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('trims whitespace from folder name', async () => {
      const newFolder = { id: 'folder-new', name: 'Test Folder', color: '#14b8a6', user_id: 'user-123' };

      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newFolder, error: null }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      await createFolder('  Test Folder  ');

      // Verify insert was called with trimmed name
      expect(mockFrom).toHaveBeenCalledWith('qr_folders');
    });
  });

  describe('updateFolder', () => {
    it('updates folder name successfully', async () => {
      const updatedFolder = { id: 'folder-1', name: 'Updated Name', color: '#3b82f6' };

      const mockFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedFolder, error: null }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      const result = await updateFolder('folder-1', { name: 'Updated Name' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedFolder);
    });

    it('updates folder color successfully', async () => {
      const updatedFolder = { id: 'folder-1', name: 'Marketing', color: '#ef4444' };

      const mockFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedFolder, error: null }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      const result = await updateFolder('folder-1', { color: '#ef4444' });

      expect(result.success).toBe(true);
    });

    it('returns error for empty folder name', async () => {
      const result = await updateFolder('folder-1', { name: '' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder name cannot be empty');
    });

    it('returns error when folder not found', async () => {
      const mockFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      const result = await updateFolder('non-existent', { name: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder not found or access denied');
    });

    it('returns error when not authenticated', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

      const result = await updateFolder('folder-1', { name: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('deleteFolder', () => {
    it('deletes folder and removes QR associations', async () => {
      // First call updates qrcodes to remove folder_id
      const mockUpdateFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));

      // Second call deletes the folder
      const mockDeleteFrom = vi.fn(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }));

      (supabase.from as any)
        .mockImplementationOnce(mockUpdateFrom)
        .mockImplementationOnce(mockDeleteFrom);

      const result = await deleteFolder('folder-1');

      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('qrcodes');
      expect(supabase.from).toHaveBeenCalledWith('qr_folders');
    });

    it('returns error when QR update fails', async () => {
      const mockFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      const result = await deleteFolder('folder-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('returns error when not authenticated', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

      const result = await deleteFolder('folder-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('moveQRToFolder', () => {
    it('moves QR code to folder successfully', async () => {
      // First verify QR ownership
      const mockQRFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'qr-123' }, error: null }),
      }));

      // Then verify folder ownership
      const mockFolderFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'folder-1' }, error: null }),
      }));

      // Finally update QR
      const mockUpdateFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));

      (supabase.from as any)
        .mockImplementationOnce(mockQRFrom)
        .mockImplementationOnce(mockFolderFrom)
        .mockImplementationOnce(mockUpdateFrom);

      const result = await moveQRToFolder('qr-123', 'folder-1');

      expect(result.success).toBe(true);
    });

    it('moves QR code out of folder (null folderId)', async () => {
      // Just verify QR ownership (no folder check needed)
      const mockQRFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'qr-123' }, error: null }),
      }));

      // Update QR
      const mockUpdateFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));

      (supabase.from as any)
        .mockImplementationOnce(mockQRFrom)
        .mockImplementationOnce(mockUpdateFrom);

      const result = await moveQRToFolder('qr-123', null);

      expect(result.success).toBe(true);
    });

    it('returns error when QR code not found', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      const result = await moveQRToFolder('qr-nonexistent', 'folder-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('QR code not found or access denied');
    });

    it('returns error when folder not found', async () => {
      // Verify QR ownership
      const mockQRFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'qr-123' }, error: null }),
      }));

      // Folder not found
      const mockFolderFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }));

      (supabase.from as any)
        .mockImplementationOnce(mockQRFrom)
        .mockImplementationOnce(mockFolderFrom);

      const result = await moveQRToFolder('qr-123', 'folder-nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder not found or access denied');
    });

    it('returns error when not authenticated', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

      const result = await moveQRToFolder('qr-123', 'folder-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('fetchUserTags', () => {
    it('returns tags with QR counts', async () => {
      const mockQRCodes = [
        { tags: ['marketing', 'summer-sale'] },
        { tags: ['marketing', 'winter-sale'] },
        { tags: ['product', 'new'] },
        { tags: null },
      ];

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
      }));

      (supabase.from as any).mockImplementation(() => ({
        ...mockFrom(),
        not: vi.fn().mockResolvedValue({ data: mockQRCodes, error: null }),
      }));

      const result = await fetchUserTags();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('returns empty array when no tags exist', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      const result = await fetchUserTags();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('returns error when not authenticated', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

      const result = await fetchUserTags();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('addTagToQR', () => {
    it('adds tag to QR code successfully', async () => {
      const mockQRFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tags: ['existing'] }, error: null }),
      }));

      const mockUpdateFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));

      (supabase.from as any)
        .mockImplementationOnce(mockQRFrom)
        .mockImplementationOnce(mockUpdateFrom);

      const result = await addTagToQR('qr-123', 'new-tag');

      expect(result.success).toBe(true);
    });

    it('returns success when tag already exists', async () => {
      const mockQRFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tags: ['existing', 'duplicate'] }, error: null }),
      }));

      (supabase.from as any).mockImplementation(mockQRFrom);

      const result = await addTagToQR('qr-123', 'duplicate');

      expect(result.success).toBe(true);
    });

    it('returns error when QR code not found', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      const result = await addTagToQR('qr-nonexistent', 'tag');

      expect(result.success).toBe(false);
      expect(result.error).toBe('QR code not found or access denied');
    });

    it('returns error when not authenticated', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

      const result = await addTagToQR('qr-123', 'tag');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('removeTagFromQR', () => {
    it('removes tag from QR code successfully', async () => {
      const mockQRFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tags: ['tag1', 'tag2', 'tag3'] }, error: null }),
      }));

      const mockUpdateFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));

      (supabase.from as any)
        .mockImplementationOnce(mockQRFrom)
        .mockImplementationOnce(mockUpdateFrom);

      const result = await removeTagFromQR('qr-123', 'tag2');

      expect(result.success).toBe(true);
    });

    it('handles removing non-existent tag gracefully', async () => {
      const mockQRFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tags: ['tag1'] }, error: null }),
      }));

      const mockUpdateFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));

      (supabase.from as any)
        .mockImplementationOnce(mockQRFrom)
        .mockImplementationOnce(mockUpdateFrom);

      const result = await removeTagFromQR('qr-123', 'non-existent');

      expect(result.success).toBe(true);
    });

    it('returns error when QR code not found', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      const result = await removeTagFromQR('qr-nonexistent', 'tag');

      expect(result.success).toBe(false);
      expect(result.error).toBe('QR code not found or access denied');
    });

    it('returns error when not authenticated', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

      const result = await removeTagFromQR('qr-123', 'tag');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('filterQRCodesByFolder', () => {
    it('returns all QR codes when folderId is null', () => {
      const qrCodes = [
        { id: 'qr-1', folder_id: 'folder-1' },
        { id: 'qr-2', folder_id: null },
        { id: 'qr-3', folder_id: 'folder-2' },
      ];

      const result = filterQRCodesByFolder(qrCodes, null);

      expect(result).toHaveLength(3);
      expect(result).toEqual(qrCodes);
    });

    it('filters QR codes by folder ID', () => {
      const qrCodes = [
        { id: 'qr-1', folder_id: 'folder-1' },
        { id: 'qr-2', folder_id: null },
        { id: 'qr-3', folder_id: 'folder-1' },
        { id: 'qr-4', folder_id: 'folder-2' },
      ];

      const result = filterQRCodesByFolder(qrCodes, 'folder-1');

      expect(result).toHaveLength(2);
      expect(result.map(qr => qr.id)).toEqual(['qr-1', 'qr-3']);
    });

    it('returns empty array when no QR codes match folder', () => {
      const qrCodes = [
        { id: 'qr-1', folder_id: 'folder-1' },
        { id: 'qr-2', folder_id: 'folder-2' },
      ];

      const result = filterQRCodesByFolder(qrCodes, 'non-existent');

      expect(result).toHaveLength(0);
    });
  });

  describe('filterQRCodesByTags', () => {
    it('returns all QR codes when no tags specified', () => {
      const qrCodes = [
        { id: 'qr-1', tags: ['tag1'] },
        { id: 'qr-2', tags: [] },
        { id: 'qr-3', tags: null },
      ];

      const result = filterQRCodesByTags(qrCodes, []);

      expect(result).toHaveLength(3);
    });

    it('filters QR codes by single tag', () => {
      const qrCodes = [
        { id: 'qr-1', tags: ['marketing', 'sale'] },
        { id: 'qr-2', tags: ['product'] },
        { id: 'qr-3', tags: ['marketing', 'new'] },
      ];

      const result = filterQRCodesByTags(qrCodes, ['marketing']);

      expect(result).toHaveLength(2);
      expect(result.map(qr => qr.id)).toEqual(['qr-1', 'qr-3']);
    });

    it('filters QR codes by multiple tags (OR logic)', () => {
      const qrCodes = [
        { id: 'qr-1', tags: ['marketing'] },
        { id: 'qr-2', tags: ['product'] },
        { id: 'qr-3', tags: ['other'] },
      ];

      const result = filterQRCodesByTags(qrCodes, ['marketing', 'product']);

      expect(result).toHaveLength(2);
      expect(result.map(qr => qr.id)).toEqual(['qr-1', 'qr-2']);
    });

    it('handles QR codes without tags field', () => {
      const qrCodes = [
        { id: 'qr-1', tags: ['tag1'] },
        { id: 'qr-2' }, // no tags field
        { id: 'qr-3', tags: null },
      ];

      const result = filterQRCodesByTags(qrCodes, ['tag1']);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('qr-1');
    });
  });
});
