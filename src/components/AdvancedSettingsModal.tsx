import { useState } from 'react';
import { X, Clock, Lock, Split, ScanLine } from 'lucide-react';
import QRScheduler from './scheduling/QRScheduler';
import PasswordProtection from './password/PasswordProtection';
import ABTestManager from './abtesting/ABTestManager';
import ScanLimits from './scanlimits/ScanLimits';

interface AdvancedSettingsModalProps {
  qrId: string;
  qrName: string;
  onClose: () => void;
}

type TabId = 'scheduling' | 'protection' | 'abtesting' | 'limits';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

export default function AdvancedSettingsModal({ qrId, qrName, onClose }: AdvancedSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('scheduling');

  const tabs: Tab[] = [
    {
      id: 'scheduling',
      label: 'Scheduling',
      icon: <Clock size={16} />,
      component: <QRScheduler qrId={qrId} />,
    },
    {
      id: 'protection',
      label: 'Protection',
      icon: <Lock size={16} />,
      component: <PasswordProtection qrId={qrId} />,
    },
    {
      id: 'abtesting',
      label: 'A/B Testing',
      icon: <Split size={16} />,
      component: <ABTestManager qrId={qrId} />,
    },
    {
      id: 'limits',
      label: 'Limits',
      icon: <ScanLine size={16} />,
      component: <ScanLimits qrId={qrId} />,
    },
  ];

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0,0,0,0.5)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 1000 
      }} 
      onClick={onClose}
    >
      <div 
        style={{ 
          background: 'white', 
          borderRadius: '1rem', 
          width: '90%', 
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: '1rem 1.5rem', 
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Advanced Settings</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>{qrName}</p>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              padding: '0.5rem', 
              border: 'none', 
              background: 'transparent', 
              cursor: 'pointer',
              borderRadius: '0.375rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #14b8a6' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: activeTab === tab.id ? '#14b8a6' : '#6b7280',
                transition: 'all 0.2s'
              }}
            >
              {tab.icon}
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ 
          padding: '1.5rem', 
          overflowY: 'auto',
          flex: 1
        }}>
          {tabs.find(t => t.id === activeTab)?.component}
        </div>
      </div>
    </div>
  );
}
