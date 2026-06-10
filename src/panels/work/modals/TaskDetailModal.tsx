import { useEffect, useState } from 'react';
import { Clock, MoreHorizontal, Send, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal, toast } from '@ds/feedback';
import { Button, Input, Textarea, Select, Checkbox, Chip } from '@ds/primitives';
import { Avatar, StatusBadge } from '@ds/data-display';
import { DropdownMenu } from '@ds/overlays';
import { formatDate, formatDateTime } from '@/lib/format';
import { useTaskMutations } from '../hooks';
import { routes } from '@/config/routes';
import type { Task, TaskPriority, TaskStatus } from '@/types';

const STATUSES: TaskStatus[] = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

export function TaskDetailModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const navigate = useNavigate();
  const { update } = useTaskMutations();
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => { if (task) setTitle(task.title); }, [task]);
  if (!task) return null;

  const patch = (data: Partial<Task>) => update.mutate({ id: task.id, data });

  return (
    <Modal open={!!task} onClose={onClose} size="xl">
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Left */}
        <div className="space-y-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { if (title !== task.title) { patch({ title }); toast.success('Title updated'); } }}
            className="w-full rounded-lg border border-transparent bg-transparent px-1 font-display text-xl font-bold text-content hover:border-line focus:border-brand-500 focus-visible:ring-2"
          />

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-content-subtle">Description</p>
            <Textarea defaultValue={task.description} placeholder="Add a description…" onBlur={(e) => patch({ description: e.target.value })} />
          </div>

          {task.checklist.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-content-subtle">Checklist</p>
              <div className="space-y-1.5">
                {task.checklist.map((c) => (
                  <label key={c.id} className="flex items-center gap-2.5 text-sm">
                    <Checkbox defaultChecked={c.done} /> <span className={c.done ? 'text-content-subtle line-through' : 'text-content'}>{c.text}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-subtle">Comments</p>
            <div className="space-y-3">
              {task.comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar name={c.author} size="sm" />
                  <div className="min-w-0 flex-1 rounded-lg bg-surface-sunken px-3 py-2">
                    <p className="text-xs font-medium text-content">{c.author} <span className="font-normal text-content-subtle">· {formatDateTime(c.at)}</span></p>
                    <p className="text-sm text-content">{c.body}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment… @mention" />
                <Button icon={Send} aria-label="Send" onClick={() => { if (comment) { toast.success('Comment added'); setComment(''); } }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4 lg:border-l lg:border-line lg:pl-6">
          <div className="flex items-center justify-between">
            <StatusBadge status={task.status} />
            <DropdownMenu
              trigger={<Button size="sm" variant="ghost" icon={MoreHorizontal} aria-label="Actions" />}
              items={[
                { label: 'Duplicate' },
                { label: 'Move to project' },
                { label: 'Archive' },
                'divider',
                { label: 'Delete', danger: true },
              ]}
            />
          </div>

          <label className="block">
            <span className="text-xs font-medium text-content-muted">Status</span>
            <Select sizeVariant="sm" defaultValue={task.status} onChange={(e) => { patch({ status: e.target.value as TaskStatus }); toast.success('Status updated'); }} options={STATUSES.map((s) => ({ value: s, label: s }))} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-content-muted">Priority</span>
            <Select sizeVariant="sm" defaultValue={task.priority} onChange={(e) => patch({ priority: e.target.value as TaskPriority })} options={PRIORITIES.map((p) => ({ value: p, label: p }))} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-content-muted">Due Date</span>
            <Input sizeVariant="sm" type="date" defaultValue={task.dueDate ?? ''} onChange={(e) => patch({ dueDate: e.target.value })} />
          </label>

          <div>
            <span className="text-xs font-medium text-content-muted">Project</span>
            {task.projectId ? (
              <button onClick={() => navigate(routes.project(task.projectId!))} className="mt-1 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
                <Link2 size={14} /> {task.projectName}
              </button>
            ) : (
              <p className="mt-1 text-sm text-content-muted">Standalone</p>
            )}
          </div>

          <div>
            <span className="text-xs font-medium text-content-muted">Assignees</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {task.assignees.map((a) => (
                <span key={a} className="flex items-center gap-1.5 rounded-full bg-surface-sunken py-0.5 pl-0.5 pr-2 text-xs">
                  <Avatar name={a} size="xs" /> {a}
                </span>
              ))}
            </div>
          </div>

          {task.labels.length > 0 && (
            <div>
              <span className="text-xs font-medium text-content-muted">Labels</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">{task.labels.map((l) => <Chip key={l} tone="brand">{l}</Chip>)}</div>
            </div>
          )}

          <div className="rounded-lg bg-surface-sunken p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-content-muted"><Clock size={14} /> Time Logged</span>
              <span className="nums font-semibold text-content">{task.hoursLogged}h</span>
            </div>
            <Button size="sm" variant="outline" fullWidth className="mt-2" onClick={() => {
              const raw = window.prompt('Hours to log on this task?');
              const h = Number(raw);
              if (raw && h > 0) { patch({ hoursLogged: task.hoursLogged + h }); toast.success(`Logged ${h}h`); }
            }}>Log time</Button>
          </div>

          <p className="text-2xs text-content-subtle">Created by {task.createdBy} · {formatDate(task.createdAt)}</p>
        </div>
      </div>
    </Modal>
  );
}
