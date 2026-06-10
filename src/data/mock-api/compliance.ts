import type { DocFile, DocFolder, ImportantDate } from '@/types';
import { supabase } from '@/lib/supabase';
import { rowToCamel, rowsToCamel, toSnake } from '@/lib/case';

export const datesApi = {
  async list(filters: { category?: string; search?: string } = {}): Promise<ImportantDate[]> {
    let q = supabase.from('important_dates').select('*');
    if (filters.category) q = q.eq('category', filters.category);
    if (filters.search) q = q.ilike('title', `%${filters.search}%`);
    const { data, error } = await q.order('date');
    if (error) throw error;
    return rowsToCamel<ImportantDate>(data);
  },
  async create(data: Partial<ImportantDate>): Promise<ImportantDate> {
    const { id: _i, ...rest } = data;
    const { data: row, error } = await supabase.from('important_dates').insert(toSnake(rest)).select().single();
    if (error) throw error;
    return rowToCamel<ImportantDate>(row)!;
  },
  async update(id: string, data: Partial<ImportantDate>): Promise<ImportantDate> {
    const { id: _i, ...rest } = data;
    const { data: row, error } = await supabase.from('important_dates').update(toSnake(rest)).eq('id', id).select().single();
    if (error) throw error;
    return rowToCamel<ImportantDate>(row)!;
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('important_dates').delete().eq('id', id);
    if (error) throw error;
  },
};

/** Map a MIME type / filename to the DocFile.type union. */
function fileType(mime: string, name: string): DocFile['type'] {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mime.includes('pdf') || ext === 'pdf') return 'pdf';
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  if (mime.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet';
  if (mime.includes('word') || mime.includes('document') || ['doc', 'docx'].includes(ext)) return 'doc';
  return 'other';
}

export const documentsApi = {
  async folders(): Promise<DocFolder[]> {
    // count = number of files in each folder.
    const [{ data: folders, error: e1 }, { data: files, error: e2 }] = await Promise.all([
      supabase.from('doc_folders').select('*').order('name'),
      supabase.from('doc_files').select('folder_id'),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    const counts = new Map<string, number>();
    (files ?? []).forEach((f) => counts.set(f.folder_id as string, (counts.get(f.folder_id as string) ?? 0) + 1));
    return (folders ?? []).map((f) => ({ ...rowToCamel<DocFolder>(f)!, count: counts.get(f.id as string) ?? 0 }));
  },
  async files(folderId: string): Promise<DocFile[]> {
    const { data, error } = await supabase.from('doc_files').select('*').eq('folder_id', folderId).order('uploaded_at', { ascending: false });
    if (error) throw error;
    return rowsToCamel<DocFile>(data);
  },
  async createFolder(name: string, parentId: string | null = null): Promise<DocFolder> {
    const { data, error } = await supabase.from('doc_folders').insert({ name, parent_id: parentId }).select('*').single();
    if (error) throw error;
    return { ...rowToCamel<DocFolder>(data)!, count: 0 };
  },
  /** Upload a file to Google Drive (via edge function) then record it. */
  async uploadFile(folder: DocFolder, file: File): Promise<DocFile> {
    const form = new FormData();
    form.append('file', file);
    form.append('category', 'documents');
    form.append('folder', folder.name);
    const { data: res, error: fnErr } = await supabase.functions.invoke('gdrive-upload', { body: form });
    if (fnErr) throw fnErr;
    if ((res as { error?: string }).error) throw new Error((res as { error: string }).error);
    const r = res as { drive_file_id: string; drive_view_url: string; file_name: string; mime_type: string; size_bytes: number };

    const { data: row, error } = await supabase.from('doc_files').insert({
      folder_id: folder.id,
      name: r.file_name,
      type: fileType(r.mime_type, r.file_name),
      size_kb: Math.max(1, Math.round(r.size_bytes / 1024)),
      mime_type: r.mime_type,
      drive_file_id: r.drive_file_id,
      drive_view_url: r.drive_view_url,
    }).select('*').single();
    if (error) throw error;
    return rowToCamel<DocFile>(row)!;
  },
  async deleteFile(file: DocFile & { driveFileId?: string }): Promise<void> {
    if (file.driveFileId) {
      await supabase.functions.invoke('gdrive-delete', { body: { drive_file_id: file.driveFileId } });
    }
    const { error } = await supabase.from('doc_files').delete().eq('id', file.id);
    if (error) throw error;
  },
};
