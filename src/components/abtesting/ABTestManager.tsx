import { useState, useEffect } from 'react';
import { Split, Plus, ArrowRight, BarChart2, Pause, Play, CheckCircle } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { fetchABTests, ABTest } from '../../services/abTestService';
import ABTestResults from './ABTestResults';
import toast from 'react-hot-toast';

interface ABTestManagerProps {
  qrId: string;
}

type ViewMode = 'list' | 'create' | 'results';

export default function ABTestManager({ qrId }: ABTestManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  
  // Create form state
  const [variants, setVariants] = useState([{ name: 'A', url: '', weight: 50 }]);
  const [testName, setTestName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTests();
  }, [qrId]);

  async function loadTests() {
    setLoading(true);
    const response = await fetchABTests(qrId);
    if (response.success && response.tests) {
      setTests(response.tests);
    } else if (response.error) {
      toast.error(response.error);
    }
    setLoading(false);
  }

  async function createTest() {
    if (!testName.trim()) {
      toast.error('Please enter a test name');
      return;
    }
    
    if (variants.length < 2) {
      toast.error('Please add at least 2 variants');
      return;
    }

    const invalidVariant = variants.find(v => !v.url.trim());
    if (invalidVariant) {
      toast.error(`Please enter a URL for variant ${invalidVariant.name}`);
      return;
    }

    // Check weights sum to 100
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight !== 100) {
      toast.error(`Variant weights must sum to 100% (currently ${totalWeight}%)`);
      return;
    }

    setCreating(true);
    
    const { data: test, error } = await supabase
      .from('ab_tests')
      .insert({ qr_id: qrId, name: testName.trim() })
      .select()
      .single();
      
    if (error || !test) {
      toast.error('Failed to create test');
      setCreating(false);
      return;
    }

    const { error: variantsError } = await supabase
      .from('ab_variants')
      .insert(variants.map(v => ({ ...v, test_id: test.id })));

    if (variantsError) {
      toast.error('Failed to create variants');
      // Clean up the test
      await supabase.from('ab_tests').delete().eq('id', test.id);
      setCreating(false);
      return;
    }

    toast.success('A/B test created successfully');
    
    // Reset form and go back to list
    setTestName('');
    setVariants([{ name: 'A', url: '', weight: 50 }]);
    setCreating(false);
    setViewMode('list');
    loadTests();
  }

  function viewResults(testId: string) {
    setSelectedTestId(testId);
    setViewMode('results');
  }

  async function updateTestStatus(testId: string, newStatus: 'active' | 'paused' | 'completed') {
    const { error } = await supabase
      .from('ab_tests')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', testId);

    if (error) {
      toast.error('Failed to update test status');
      return;
    }

    toast.success(`Test ${newStatus}`);
    loadTests();
  }

  if (viewMode === 'results' && selectedTestId) {
    return (
      <ABTestResults 
        testId={selectedTestId} 
        onClose={() => {
          setViewMode('list');
          setSelectedTestId(null);
        }} 
      />
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '1.5rem'
      }}>
        <button
          onClick={() => setViewMode('list')}
          style={{
            padding: '0.75rem 1rem',
            border: 'none',
            borderBottom: viewMode === 'list' ? '2px solid #14b8a6' : '2px solid transparent',
            background: 'transparent',
            color: viewMode === 'list' ? '#14b8a6' : '#6b7280',
            fontWeight: viewMode === 'list' ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <BarChart2 size={16} />
          Your Tests ({tests.length})
        </button>
        <button
          onClick={() => setViewMode('create')}
          style={{
            padding: '0.75rem 1rem',
            border: 'none',
            borderBottom: viewMode === 'create' ? '2px solid #14b8a6' : '2px solid transparent',
            background: 'transparent',
            color: viewMode === 'create' ? '#14b8a6' : '#6b7280',
            fontWeight: viewMode === 'create' ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus size={16} />
          Create New
        </button>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                border: '3px solid rgba(20, 184, 166, 0.2)', 
                borderTopColor: '#14b8a6', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem'
              }} />
              Loading tests...
            </div>
          ) : tests.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem 1rem',
              background: '#f9fafb',
              borderRadius: '0.75rem',
              border: '2px dashed #e5e7eb'
            }}>
              <Split size={48} style={{ color: '#9ca3af', margin: '0 auto 1rem' }} />
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No A/B tests yet</p>
              <button
                onClick={() => setViewMode('create')}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#14b8a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Create your first test
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tests.map((test) => (
                <div 
                  key={test.id}
                  style={{
                    padding: '1rem',
                    background: 'white',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600 }}>{test.name}</span>
                      <span style={{ 
                        fontSize: '0.75rem',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '0.25rem',
                        background: test.status === 'active' ? '#ecfdf5' : test.status === 'paused' ? '#fef3c7' : '#f3f4f6',
                        color: test.status === 'active' ? '#059669' : test.status === 'paused' ? '#d97706' : '#6b7280',
                        textTransform: 'capitalize'
                      }}>
                        {test.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      Created {new Date(test.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {test.status === 'active' && (
                      <button
                        onClick={() => updateTestStatus(test.id, 'paused')}
                        style={{
                          padding: '0.5rem',
                          background: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Pause test"
                      >
                        <Pause size={16} />
                      </button>
                    )}
                    {test.status === 'paused' && (
                      <button
                        onClick={() => updateTestStatus(test.id, 'active')}
                        style={{
                          padding: '0.5rem',
                          background: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Resume test"
                      >
                        <Play size={16} />
                      </button>
                    )}
                    {test.status !== 'completed' && (
                      <button
                        onClick={() => updateTestStatus(test.id, 'completed')}
                        style={{
                          padding: '0.5rem',
                          background: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Mark as completed"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => viewResults(test.id)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: '#14b8a6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      Results
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create View */}
      {viewMode === 'create' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              Test Name
            </label>
            <input
              type="text"
              placeholder="e.g., Homepage CTA Test"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <h4 style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>Variants</h4>
          
          {variants.map((variant, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              marginBottom: '0.75rem',
              alignItems: 'flex-start'
            }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="Variant name"
                  value={variant.name}
                  onChange={(e) => {
                    const newVariants = [...variants];
                    newVariants[index].name = e.target.value;
                    setVariants(newVariants);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    marginBottom: '0.25rem'
                  }}
                />
                <input
                  type="text"
                  placeholder="Destination URL"
                  value={variant.url}
                  onChange={(e) => {
                    const newVariants = [...variants];
                    newVariants[index].url = e.target.value;
                    setVariants(newVariants);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <input
                  type="number"
                  placeholder="%"
                  value={variant.weight}
                  onChange={(e) => {
                    const newVariants = [...variants];
                    newVariants[index].weight = parseInt(e.target.value) || 0;
                    setVariants(newVariants);
                  }}
                  style={{
                    width: '60px',
                    padding: '0.5rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    textAlign: 'center'
                  }}
                />
                {variants.length > 2 && (
                  <button
                    onClick={() => {
                      const newVariants = variants.filter((_, i) => i !== index);
                      setVariants(newVariants);
                    }}
                    style={{
                      padding: '0.25rem',
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      color: '#dc2626'
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              onClick={() => setVariants([...variants, { 
                name: String.fromCharCode(65 + variants.length), 
                url: '', 
                weight: 0 
              }])}
              disabled={variants.length >= 5}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: '1px solid #14b8a6',
                color: '#14b8a6',
                borderRadius: '0.375rem',
                cursor: variants.length >= 5 ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                opacity: variants.length >= 5 ? 0.5 : 1
              }}
            >
              + Add Variant (max 5)
            </button>
            <button
              onClick={createTest}
              disabled={creating}
              style={{
                padding: '0.5rem 1rem',
                background: '#14b8a6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: creating ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                opacity: creating ? 0.7 : 1
              }}
            >
              {creating ? 'Creating...' : 'Create Test'}
            </button>
          </div>
          
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem',
            background: '#f9fafb',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            <strong>Total weight: {variants.reduce((sum, v) => sum + v.weight, 0)}%</strong>
            {variants.reduce((sum, v) => sum + v.weight, 0) !== 100 && (
              <span style={{ color: '#dc2626', marginLeft: '0.5rem' }}>
                (must equal 100%)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
