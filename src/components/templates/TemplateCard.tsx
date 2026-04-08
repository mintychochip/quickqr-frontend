import { Wifi, User, Calendar, Utensils, DollarSign, Smartphone, Globe, Share2 } from 'lucide-react';
import { Template } from '../../data/builtinTemplates';
import { QRCodeSVG } from 'qrcode.react';

interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  user: User,
  calendar: Calendar,
  utensils: Utensils,
  'dollar-sign': DollarSign,
  instagram: Globe,
  linkedin: Share2,
  smartphone: Smartphone,
};

export default function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const Icon = iconMap[template.icon] || User;
  
  // Generate sample QR data for preview
  const previewData = JSON.stringify(template.defaultContent);
  
  return (
    <div 
      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={() => onSelect(template)}
    >
      {/* Preview Area */}
      <div 
        className="p-6 flex items-center justify-center"
        style={{ backgroundColor: template.styling.backgroundOptions?.color || '#ffffff' }}
      >
        <div className="relative">
          <QRCodeSVG
            value={previewData}
            size={120}
            bgColor={template.styling.backgroundOptions?.color || '#ffffff'}
            fgColor={template.styling.dotsOptions?.color || '#000000'}
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-lg">
            <span className="bg-white text-slate-900 px-3 py-1 rounded-full text-sm font-medium shadow-sm">
              Use Template
            </span>
          </div>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" style={{ color: template.styling.dotsOptions?.color }} />
          <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">
            {template.category}
          </span>
        </div>
        <h3 className="font-semibold text-slate-900 mb-1">{template.name}</h3>
        <p className="text-sm text-slate-600">{template.description}</p>
      </div>
    </div>
  );
}
