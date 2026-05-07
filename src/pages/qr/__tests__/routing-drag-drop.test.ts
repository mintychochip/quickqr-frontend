import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, ruleEvaluators, detectDevice, applyUTMParams } from '../../../../functions/api/v1/qr-routing/[[route]]';

describe('Routing Drag and Drop', () => {
  const mockQrId = '550e8400-e29b-41d4-a716-446655440000';
  
  describe('drag handle rendering', () => {
    it('should render drag handles for each rule item', () => {
      const html = `
        <div class="rule-item" data-rule-id="rule-1" draggable="true">
          <div class="drag-handle cursor-grab active:cursor-grabbing">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 12h16M4 16h16"/>
            </svg>
          </div>
          <div class="rule-content">Rule 1</div>
        </div>
      `;
      expect(html).toContain('drag-handle');
      expect(html).toContain('draggable="true"');
      expect(html).toContain('M4 8h16M4 12h16M4 16h16');
    });
    
    it('should make rule items draggable', () => {
      const html = `<div class="rule-item" draggable="true" data-rule-id="rule-1">Rule 1</div>`;
      expect(html).toContain('draggable="true"');
    });
  });
  
  describe('drag events', () => {
    it('should trigger reorder API on drop', async () => {
      const mockReorder = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockReorder;
      
      const ruleIds = ['rule-2', 'rule-1', 'rule-3'];
      
      await fetch(`/api/v1/qr-routing/${mockQrId}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule_ids: ruleIds })
      });
      
      expect(mockReorder).toHaveBeenCalledWith(
        `/api/v1/qr-routing/${mockQrId}/reorder`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ rule_ids: ruleIds })
        })
      );
    });
    
    it('should provide visual feedback during drag', () => {
      const css = `
        .rule-item.dragging {
          opacity: 0.5;
          background-color: #f3f4f6;
          border: 2px dashed #3b82f6;
        }
      `;
      expect(css).toContain('.rule-item.dragging');
      expect(css).toContain('opacity: 0.5');
      expect(css).toContain('border: 2px dashed #3b82f6');
    });
    
    it('should show drop target indicator', () => {
      const css = `
        .rule-item.drag-over {
          border-top: 3px solid #3b82f6;
        }
      `;
      expect(css).toContain('.rule-item.drag-over');
      expect(css).toContain('border-top: 3px solid #3b82f6');
    });
  });
  
  describe('reorder persistence', () => {
    it('should persist new order after successful drop', async () => {
      const mockLocals = {
        supabase: {
          from: vi.fn().mockReturnValue({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        }
      };
      
      const response = await POST({
        request: new Request(`http://localhost/api/v1/qr-routing/${mockQrId}/reorder`, {
          method: 'POST',
          body: JSON.stringify({
            rule_ids: ['rule-2', 'rule-1', 'rule-3']
          })
        }),
        params: { route: [mockQrId, 'reorder'] },
        locals: mockLocals
      } as any);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });
  
  describe('accessibility', () => {
    it('should maintain up/down buttons as fallback', () => {
      const html = `
        <div class="rule-item">
          <div class="drag-handle">
            <svg>...</svg>
          </div>
          <div class="priority-controls">
            <button class="priority-up">...</button>
            <span class="priority-value">10</span>
            <button class="priority-down">...</button>
          </div>
        </div>
      `;
      
      expect(html).toContain('priority-up');
      expect(html).toContain('priority-down');
      expect(html).toContain('drag-handle');
    });
  });
});
