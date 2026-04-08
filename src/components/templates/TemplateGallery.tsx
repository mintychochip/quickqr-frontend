import { useState, useMemo } from 'react';
import { Search, LayoutGrid } from 'lucide-react';
import { builtinTemplates, getAllCategories, Template } from '../../data/builtinTemplates';
import TemplateCard from './TemplateCard';

interface TemplateGalleryProps {
  onTemplateSelect: (template: Template) => void;
}

const categoryLabels: Record<string, string> = {
  business: 'Business',
  personal: 'Personal',
  events: 'Events',
  marketing: 'Marketing',
  social: 'Social Media',
};

export default function TemplateGallery({ onTemplateSelect }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => ['all', ...getAllCategories()], []);

  const filteredTemplates = useMemo(() => {
    return builtinTemplates.filter(template => {
      const matchesSearch = 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-teal-600" />
            Templates
          </h2>
          <p className="text-slate-600 mt-1">
            Choose a template to get started quickly
          </p>
        </div>
        
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {category === 'all' ? 'All Templates' : categoryLabels[category]}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onTemplateSelect}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-500">No templates found matching your search.</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="mt-2 text-teal-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-slate-500 text-center">
        Showing {filteredTemplates.length} of {builtinTemplates.length} templates
      </p>
    </div>
  );
}
