import { supabase } from '../lib/supabase';
import { LabResult } from '../types';

export async function deleteLabResult(id: string, filePath: string) {
  const { error: storageError } = await supabase.storage
    .from('lab-results')
    .remove([filePath]);
  
  if (storageError) {
    throw new Error('Failed to delete file');
  }

  const { error: dbError } = await supabase
    .from('lab_results')
    .delete()
    .eq('id', id);
  
  if (dbError) {
    throw new Error('Failed to delete record');
  }
}

export async function fetchLabResults(searchTerm: string, page: number, perPage: number) {
  let query = supabase
    .from('lab_results')
    .select('*', { count: 'exact' });

  if (searchTerm) {
    query = query.ilike('national_id', `%${searchTerm}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) throw error;

  return { data: data || [], count: count || 0 };
}

export function groupResultsByNationalId(results: LabResult[]) {
  return results.reduce((groups, result) => {
    if (!groups[result.national_id]) {
      groups[result.national_id] = [];
    }
    groups[result.national_id].push(result);
    return groups;
  }, {} as Record<string, LabResult[]>);
}