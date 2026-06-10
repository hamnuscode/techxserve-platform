import { useEffect, useRef, useState } from 'react';
import { FolderPlus, Upload, FileText, Image as ImageIcon, Sheet, File, Folder, MoreHorizontal, Download, Trash2 } from 'lucide-react';
import { PageHeader } from '@/shared';
import { Button } from '@ds/primitives';
import { EmptyState, ConfirmDialog, toast } from '@ds/feedback';
import { DropdownMenu } from '@ds/overlays';
import { Stagger } from '@ds/motion';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useDocFolders, useDocFiles, useDocMutations } from '../hooks';
import type { DocFile, DocFolder } from '@/types';

const FILE_ICON = { pdf: FileText, image: ImageIcon, sheet: Sheet, doc: FileText, other: File };

function fileSize(kb: number) {
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export function DocumentsPage() {
  const { data: folders = [] } = useDocFolders();
  const [active, setActive] = useState('');
  useEffect(() => { if (!active && folders[0]) setActive(folders[0].id); }, [folders, active]);
  const { data: files = [], isLoading } = useDocFiles(active);
  const { createFolder, upload, removeFile } = useDocMutations();

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmFile, setConfirmFile] = useState<DocFile | null>(null);
  const activeFolder = folders.find((f) => f.id === active) as DocFolder | undefined;

  const onPickFiles = async (list: FileList | null) => {
    if (!list?.length || !activeFolder) return;
    setUploading(true);
    try {
      for (const file of Array.from(list)) {
        await upload.mutateAsync({ folder: activeFolder, file });
      }
      toast.success(list.length > 1 ? `${list.length} files uploaded` : 'File uploaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const onNewFolder = async () => {
    const name = window.prompt('New folder name');
    if (!name?.trim()) return;
    const created = await createFolder.mutateAsync({ name: name.trim() });
    setActive(created.id);
    toast.success('Folder created');
  };

  return (
    <div>
      <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => onPickFiles(e.target.files)} />
      <PageHeader
        title="Documents"
        description="Central document vault organised by category."
        actions={<Button icon={Upload} loading={uploading} disabled={!activeFolder} onClick={() => fileInput.current?.click()}>Upload</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Folder sidebar */}
        <aside className="space-y-1">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wide text-content-subtle">Folders</span>
            <button onClick={onNewFolder} className="text-content-subtle hover:text-content" aria-label="New folder"><FolderPlus size={16} /></button>
          </div>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setActive(f.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                active === f.id ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-950/40' : 'text-content-muted hover:bg-surface-sunken hover:text-content',
              )}
            >
              <Folder size={16} />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="nums text-2xs text-content-subtle">{f.count}</span>
            </button>
          ))}
        </aside>

        {/* File grid */}
        <div>
          {/* Drag-drop upload zone */}
          <button
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onPickFiles(e.dataTransfer.files); }}
            disabled={!activeFolder || uploading}
            className="mb-4 flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line-strong bg-dotgrid py-8 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/30 disabled:opacity-60"
          >
            <Upload size={22} className="text-brand-500" />
            <span className="text-sm font-medium text-content">{uploading ? 'Uploading…' : activeFolder ? `Drop files here or click to upload to “${activeFolder.name}”` : 'Create or select a folder first'}</span>
            <span className="text-xs text-content-subtle">Stored securely in your Google Drive</span>
          </button>

          {isLoading ? null : files.length === 0 ? (
            <EmptyState icon={FileText} title="No files in this folder" description="Upload a file to get started." />
          ) : (
            <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {files.map((file: DocFile) => {
                const Icon = FILE_ICON[file.type];
                return (
                  <Stagger.Item key={file.id}>
                    <div className="group relative rounded-xl border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md">
                      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu
                          trigger={<Button size="sm" variant="ghost" icon={MoreHorizontal} aria-label="File actions" />}
                          items={[
                            { label: 'Open / Download', icon: Download, onClick: () => file.driveViewUrl ? window.open(file.driveViewUrl, '_blank', 'noopener') : toast.error('No file link') },
                            'divider',
                            { label: 'Delete', icon: Trash2, danger: true, onClick: () => setConfirmFile(file) },
                          ]}
                        />
                      </div>
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-sunken text-content-muted">
                        <Icon size={24} />
                      </div>
                      <p className="truncate text-sm font-medium text-content" title={file.name}>{file.name}</p>
                      <p className="mt-1 text-2xs text-content-subtle">{fileSize(file.sizeKb)} · {formatDate(file.uploadedAt)}</p>
                      <p className="text-2xs text-content-subtle">by {file.uploadedBy}</p>
                    </div>
                  </Stagger.Item>
                );
              })}
            </Stagger>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmFile}
        onClose={() => setConfirmFile(null)}
        onConfirm={async () => { if (confirmFile) { await removeFile.mutateAsync(confirmFile); toast.success('File deleted'); } setConfirmFile(null); }}
        title="Delete file?"
        message={`“${confirmFile?.name}” will be permanently removed from Google Drive.`}
        confirmLabel="Delete"
        tone="danger"
      />
    </div>
  );
}
