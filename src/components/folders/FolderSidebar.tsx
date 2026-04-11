import { useState, useEffect } from 'react';
import { Folder, Plus, MoreVertical, Edit2, Trash2, Tag } from 'lucide-react';
import { supabase } from '../../config/supabase';
import toast from 'react-hot-toast';

interface FolderType {
  id: string;
  name: string;
  color: string;
  icon?: string;
  qr_count?: number;
}

interface TagType {
  id: string;
  name: string;
  color: string;
  qr_count?: number;
}

interface FolderSidebarProps {
  selectedFolder: string | null;
  onFolderSelect: (folderId: string | null) => void;
  selectedTags: string[];
  onTagToggle: (tagId: string) => void;
  onUpdate: () => void;
}

const folderColors = [
  '#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'
];

export default function FolderSidebar({ 
  selectedFolder, 
  onFolderSelect, 
  selectedTags, 
  onTagToggle,
  onUpdate 
}: FolderSidebarProps) {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(folderColors[0]);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);

  useEffect(() => {
    loadFoldersAndTags();
  }, []);

  async function loadFoldersAndTags() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Load folders with QR counts via separate query
      const { data: folderData, error: folderError } = await supabase
        .from('qr_folders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (folderError) throw folderError;

      // Load QR counts per folder
      const { data: qrData } = await supabase
        .from('qrcodes')
        .select('folder_id')
        .eq('user_id', session.user.id)
        .not('folder_id', 'is', null);

      const countMap: Record<string, number> = {};
      qrData?.forEach(qr => {
        if (qr.folder_id) {
          countMap[qr.folder_id] = (countMap[qr.folder_id] || 0) + 1;
        }
      });

      // Note: tags table doesn't exist yet - will be added in future migration
      // For now, just set empty tags
      setFolders(folderData?.map(f => ({ ...f, qr_count: countMap[f.id] || 0 })) || []);
      setTags([]);
    } catch (err) {
      console.error('Error loading folders/tags:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('qr_folders')
      .insert({
        user_id: session.user.id,
        name: newFolderName.trim(),
        color: newFolderColor,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create folder');
    } else {
      setFolders([...folders, { ...data, qr_count: 0 }]);
      setNewFolderName('');
      setShowNewFolder(false);
      toast.success('Folder created');
      onUpdate();
    }
  }

  async function deleteFolder(folderId: string) {
    if (!confirm('Delete this folder? QR codes will be moved to root.')) return;

    const { error } = await supabase
      .from('qr_folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      toast.error('Failed to delete folder');
    } else {
      setFolders(folders.filter(f => f.id !== folderId));
      if (selectedFolder === folderId) onFolderSelect(null);
      toast.success('Folder deleted');
      onUpdate();
    }
  }

  if (loading) {
    return (
      <div className="folder-sidebar" style={{ width: '240px', flexShrink: 0, padding: '1rem' }}>
        <div style={{ height: '24px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '1rem' }} />
        <div style={{ height: '40px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '0.5rem' }} />
        <div style={{ height: '40px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '0.5rem' }} />
      </div>
    );
  }

  return (
    <div className="folder-sidebar" style={{ 
      width: '240px', 
      flexShrink: 0, 
      padding: '1rem',
      borderRight: '1px solid #e5e7eb',
      height: '100%',
      overflowY: 'auto'
    }}>
      {/* All QR Codes */}
      <button
        onClick={() => onFolderSelect(null)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.625rem 0.75rem',
          borderRadius: '0.5rem',
          border: 'none',
          background: selectedFolder === null ? '#f0fdfa' : 'transparent',
          color: selectedFolder === null ? '#0f766e' : '#374151',
          cursor: 'pointer',
          fontWeight: selectedFolder === null ? 600 : 400,
          marginBottom: '0.5rem',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
        All QR Codes
      </button>

      {/* Folders Section */}
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
          padding: '0 0.5rem'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Folders
          </span>
          <button
            onClick={() => setShowNewFolder(true)}
            style={{
              padding: '0.25rem',
              borderRadius: '0.25rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#6b7280',
            }}
            title="New Folder"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* New Folder Input */}
        {showNewFolder && (
          <div style={{ marginBottom: '0.75rem', padding: '0.5rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '0.375rem 0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid #d1d5db',
                fontSize: '0.875rem',
                marginBottom: '0.5rem',
              }}
            />
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              {folderColors.map(color => (
                <button
                  key={color}
                  onClick={() => setNewFolderColor(color)}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: color,
                    border: newFolderColor === color ? '2px solid #1f2937' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={createFolder}
                style={{
                  flex: 1,
                  padding: '0.375rem 0.5rem',
                  background: '#14b8a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Create
              </button>
              <button
                onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                style={{
                  flex: 1,
                  padding: '0.375rem 0.5rem',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Folder List */}
        {folders.map(folder => (
          <div
            key={folder.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.25rem',
            }}
          >
            <button
              onClick={() => onFolderSelect(folder.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: selectedFolder === folder.id ? '#f0fdfa' : 'transparent',
                color: selectedFolder === folder.id ? '#0f766e' : '#374151',
                cursor: 'pointer',
                fontWeight: selectedFolder === folder.id ? 500 : 400,
                fontSize: '0.875rem',
              }}
            >
              <Folder size={16} style={{ color: folder.color }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                {folder.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 'auto' }}>
                {folder.qr_count || 0}
              </span>
            </button>
            <button
              onClick={() => deleteFolder(folder.id)}
              style={{
                padding: '0.25rem',
                borderRadius: '0.25rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#9ca3af',
                opacity: 0,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
              title="Delete folder"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {folders.length === 0 && !showNewFolder && (
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', padding: '0.5rem', fontStyle: 'italic' }}>
            No folders yet
          </p>
        )}
      </div>

      {/* Tags Section */}
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
          padding: '0 0.5rem'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tags
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => onTagToggle(tag.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.625rem',
                borderRadius: '9999px',
                border: 'none',
                background: selectedTags.includes(tag.id) ? tag.color + '30' : '#f3f4f6',
                color: selectedTags.includes(tag.id) ? tag.color : '#6b7280',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: selectedTags.includes(tag.id) ? 600 : 400,
              }}
              title={`${tag.qr_count || 0} QR codes`}
            >
              <Tag size={12} />
              {tag.name}
            </button>
          ))}
        </div>

        {tags.length === 0 && (
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', padding: '0.5rem', fontStyle: 'italic' }}>
            No tags yet. Add tags when editing QR codes.
          </p>
        )}
      </div>
    </div>
  );
}
