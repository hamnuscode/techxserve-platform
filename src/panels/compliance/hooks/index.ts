import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { datesApi, documentsApi } from '@/data/mock-api';
import { qk } from '@/data/query-keys';
import type { DocFile, DocFolder, ImportantDate } from '@/types';

export function useImportantDates(filters: { category?: string; search?: string }) {
  return useQuery({ queryKey: qk.importantDates(filters), queryFn: () => datesApi.list(filters) });
}
export function useDateMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['dates'] });
  const create = useMutation({ mutationFn: (d: Partial<ImportantDate>) => datesApi.create(d), onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<ImportantDate> }) => datesApi.update(id, data), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => datesApi.remove(id), onSuccess: invalidate });
  return { create, update, remove };
}

export function useDocFolders() {
  return useQuery({ queryKey: qk.docFolders, queryFn: documentsApi.folders });
}
export function useDocFiles(folderId: string) {
  return useQuery({ queryKey: qk.docFiles(folderId), queryFn: () => documentsApi.files(folderId), enabled: !!folderId });
}
export function useDocMutations() {
  const qc = useQueryClient();
  const refreshFolders = () => qc.invalidateQueries({ queryKey: qk.docFolders });
  const createFolder = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: string | null }) => documentsApi.createFolder(name, parentId ?? null),
    onSuccess: refreshFolders,
  });
  const upload = useMutation({
    mutationFn: ({ folder, file }: { folder: DocFolder; file: File }) => documentsApi.uploadFile(folder, file),
    onSuccess: (_d, v) => { refreshFolders(); qc.invalidateQueries({ queryKey: qk.docFiles(v.folder.id) }); },
  });
  const removeFile = useMutation({
    mutationFn: (file: DocFile) => documentsApi.deleteFile(file),
    onSuccess: (_d, file) => { refreshFolders(); qc.invalidateQueries({ queryKey: qk.docFiles(file.folderId) }); },
  });
  return { createFolder, upload, removeFile };
}
