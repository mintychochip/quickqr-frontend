import { useState } from 'react';
import FolderSidebar from './folders/FolderSidebar';
import DashboardQRList from './DashboardQRList';

export default function DashboardLayout() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolder(folderId);
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleUpdate = () => {
    // Trigger refresh when folders/tags change
    setUpdateTrigger(prev => prev + 1);
  };

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0 }}>
        <FolderSidebar
          selectedFolder={selectedFolder}
          onFolderSelect={handleFolderSelect}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
          onUpdate={handleUpdate}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <DashboardQRList
          selectedFolder={selectedFolder}
          selectedTags={selectedTags}
          key={updateTrigger}
        />
      </div>
    </div>
  );
}
