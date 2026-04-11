import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, TrendingUp, Users, Target, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fetchABTestResults, ABTestResults as ABTestResultsData, ABVariantWithRate } from '../../services/abTestService';
import toast from 'react-hot-toast';

interface ABTestResultsProps {
  testId: string;
  onClose: () => void;
}

export default function ABTestResults({ testId, onClose }: ABTestResultsProps) {
  const [results, setResults] = useState<ABTestResultsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [testId]);

  async function loadResults() {
    setLoading(true);
    const response = await fetchABTestResults(testId);
    if (response.success && response.results) {
      setResults(response.results);
    } else {
      toast.error(response.error || 'Failed to load test results');
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid rgba(20, 184, 166, 0.2)', 
          borderTopColor: '#14b8a6', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite', 
          margin: '0 auto 1rem' 
        }} />
        <p>Loading test results...</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        <AlertCircle size={48} style={{ margin: '0 auto 1rem', color: '#9ca3af' }} />
        <p>Failed to load test results</p>
        <button 
          onClick={onClose}
          style={{ 
            marginTop: '1rem',
            padding: '0.5rem 1rem', 
            background: '#14b8a6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const { test, variants, total_scans, total_conversions, winner, confidence_level } = results;
  const overallConversionRate = total_scans > 0 ? (total_conversions / total_scans) * 100 : 0;

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button 
          onClick={onClose}
          style={{ 
            padding: '0.5rem', 
            background: 'transparent', 
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{test.name}</h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Status: <span style={{ 
              textTransform: 'capitalize',
              color: test.status === 'active' ? '#14b8a6' : test.status === 'paused' ? '#f59e0b' : '#6b7280'
            }}>{test.status}</span>
          </p>
        </div>
      </div>

      {/* Winner Banner */}
      {winner && confidence_level && confidence_level >= 95 && (
        <div style={{ 
          background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '0.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <Trophy size={24} />
          <div>
            <p style={{ fontWeight: 600 }}>Winner: Variant {winner.name}</p>
            <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
              {confidence_level}% confidence · {winner.conversion_rate.toFixed(2)}% conversion rate
            </p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Users size={16} color="#14b8a6" />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Scans</span>
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{total_scans.toLocaleString()}</p>
        </div>
        
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Target size={16} color="#3b82f6" />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Conversions</span>
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{total_conversions.toLocaleString()}</p>
        </div>
        
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={16} color="#8b5cf6" />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Overall Rate</span>
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{overallConversionRate.toFixed(2)}%</p>
        </div>
      </div>

      {/* Variants Comparison */}
      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ fontWeight: 600 }}>Variant Performance</h3>
        </div>
        
        <div style={{ padding: '1.5rem' }}>
          {variants.map((variant, index) => (
            <VariantRow 
              key={variant.id} 
              variant={variant} 
              isWinner={winner?.id === variant.id}
              isControl={variant.is_control}
              maxRate={Math.max(...variants.map(v => v.conversion_rate))}
            />
          ))}
        </div>
      </div>

      {/* Confidence Note */}
      {winner ? (
        confidence_level && confidence_level >= 95 ? (
          <div style={{ 
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: '#ecfdf5',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#059669'
          }}>
            <CheckCircle2 size={16} />
            <span style={{ fontSize: '0.875rem' }}>
              Statistical significance reached with {confidence_level}% confidence
            </span>
          </div>
        ) : (
          <div style={{ 
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: '#fef3c7',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#d97706'
          }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: '0.875rem' }}>
              {confidence_level}% confidence — collect more data to reach significance
            </span>
          </div>
        )
      ) : (
        <div style={{ 
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          background: '#f3f4f6',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#6b7280'
        }}>
          <AlertCircle size={16} />
          <span style={{ fontSize: '0.875rem' }}>
            No clear winner yet — continue running the test
          </span>
        </div>
      )}
    </div>
  );
}

interface VariantRowProps {
  variant: ABVariantWithRate;
  isWinner: boolean;
  isControl: boolean;
  maxRate: number;
}

function VariantRow({ variant, isWinner, isControl, maxRate }: VariantRowProps) {
  const barWidth = maxRate > 0 ? (variant.conversion_rate / maxRate) * 100 : 0;
  
  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      padding: '1rem 0',
      borderBottom: '1px solid #f3f4f6'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600 }}>Variant {variant.name}</span>
          {isControl && (
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '0.125rem 0.5rem',
              background: '#e5e7eb',
              borderRadius: '0.25rem',
              color: '#374151'
            }}>
              Control
            </span>
          )}
          {isWinner && (
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '0.125rem 0.5rem',
              background: '#14b8a6',
              borderRadius: '0.25rem',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <Trophy size={12} />
              Winner
            </span>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#14b8a6' }}>
            {variant.conversion_rate.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 1, height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${barWidth}%`, 
            height: '100%', 
            background: isWinner ? '#14b8a6' : isControl ? '#6b7280' : '#9ca3af',
            borderRadius: '4px',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
        <span>{variant.scan_count.toLocaleString()} scans</span>
        <span>{variant.conversion_count.toLocaleString()} conversions</span>
        <span>Weight: {variant.weight}%</span>
      </div>

      {/* URL */}
      <div style={{ fontSize: '0.75rem', color: '#9ca3af', wordBreak: 'break-all' }}>
        {variant.url}
      </div>
    </div>
  );
}
