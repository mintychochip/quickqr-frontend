/**
 * UTM Template Service
 * Handles saving and loading custom UTM parameter templates
 */
import { supabase } from '../config/supabase';

export interface UTMTemplate {
  id: string;
  user_id: string;
  name: string;
  source: string;
  medium: string;
  campaign?: string;
  term?: string;
  content?: string;
  created_at: string;
  updated_at: string;
}

export interface UTMParams {
  source: string;
  medium: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface CreateTemplateData {
  name: string;
  source: string;
  medium: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface FetchTemplatesResponse {
  success: boolean;
  templates?: UTMTemplate[];
  error?: string;
}

export interface CreateTemplateResponse {
  success: boolean;
  template?: UTMTemplate;
  error?: string;
}

export interface DeleteTemplateResponse {
  success: boolean;
  error?: string;
}

export interface UpdateTemplateResponse {
  success: boolean;
  template?: UTMTemplate;
  error?: string;
}

/**
 * Fetch all UTM templates for the current user
 */
export async function fetchUserUTMTemplates(): Promise<FetchTemplatesResponse> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('utm_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, templates: data || [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Create a new UTM template
 */
export async function createUTMTemplate(
  templateData: CreateTemplateData
): Promise<CreateTemplateResponse> {
  try {
    // Validate required fields first (before auth check)
    if (!templateData.name?.trim()) {
      return { success: false, error: 'Template name is required' };
    }
    if (!templateData.source?.trim()) {
      return { success: false, error: 'Source is required' };
    }
    if (!templateData.medium?.trim()) {
      return { success: false, error: 'Medium is required' };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('utm_templates')
      .insert({
        user_id: user.id,
        name: templateData.name.trim(),
        source: templateData.source.trim(),
        medium: templateData.medium.trim(),
        campaign: templateData.campaign?.trim() || null,
        term: templateData.term?.trim() || null,
        content: templateData.content?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, template: data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Update an existing UTM template
 */
export async function updateUTMTemplate(
  templateId: string,
  updates: Partial<CreateTemplateData>
): Promise<UpdateTemplateResponse> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Build update object with only provided fields
    const updateData: Record<string, string | null> = {};
    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.source !== undefined) updateData.source = updates.source.trim();
    if (updates.medium !== undefined) updateData.medium = updates.medium.trim();
    if (updates.campaign !== undefined) updateData.campaign = updates.campaign?.trim() || null;
    if (updates.term !== undefined) updateData.term = updates.term?.trim() || null;
    if (updates.content !== undefined) updateData.content = updates.content?.trim() || null;

    const { data, error } = await supabase
      .from('utm_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('user_id', user.id) // Ensure user owns the template
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, template: data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Delete a UTM template
 */
export async function deleteUTMTemplate(
  templateId: string
): Promise<DeleteTemplateResponse> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('utm_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', user.id); // Ensure user owns the template

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Apply a template to get UTM params
 */
export function applyTemplate(template: UTMTemplate): UTMParams {
  return {
    source: template.source,
    medium: template.medium,
    campaign: template.campaign,
    term: template.term,
    content: template.content,
  };
}

/**
 * Validate UTM parameters
 */
export function validateUTMParams(params: UTMParams): { valid: boolean; error?: string } {
  if (!params.source?.trim()) {
    return { valid: false, error: 'Source is required' };
  }
  if (!params.medium?.trim()) {
    return { valid: false, error: 'Medium is required' };
  }
  return { valid: true };
}
