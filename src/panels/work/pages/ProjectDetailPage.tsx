import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, MoreHorizontal, Users, FolderArchive } from 'lucide-react';
import { useFormatMoney } from '@/shared';
import { Button, Card, CardTitle, Tabs, type TabItem } from '@ds/primitives';
import { StatusBadge, Avatar, ProgressBar, DataTable, AvatarStack, DateBadge, type Column } from '@ds/data-display';
import { EmptyState, ErrorState, Skeleton, toast } from '@ds/feedback';
import { DropdownMenu } from '@ds/overlays';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useProject, useTasks, useTaskMutations } from '../hooks';
import { TaskBoard } from '../components/TaskBoard';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { CreateTaskModal } from '../modals/CreateTaskModal';
import { CreateProjectModal } from '../modals/CreateProjectModal';
import { routes } from '@/config/routes';
import type { Task, TaskStatus } from '@/types';

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const money = useFormatMoney();
  const [tab, setTab] = useState('board');
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: project, isLoading, isError, refetch } = useProject(id);
  const { data: tasks = [] } = useTasks({ project: id });
  const { update } = useTaskMutations();

  const team = useMemo(() => [...new Set(tasks.flatMap((t) => t.assignees))], [tasks]);
  const hours = tasks.reduce((s, t) => s + t.hoursLogged, 0);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (isError || !project) return <ErrorState onRetry={() => refetch()} />;

  const spentPct = project.budget ? Math.round((project.spent / project.budget) * 100) : 0;
  const margin = (project.budget ?? project.spent) - project.spent;

  const onStatusChange = (taskId: string, status: TaskStatus) => { update.mutate({ id: taskId, data: { status } }); toast.success(`Moved to ${status}`); };

  const taskCols: Column<Task>[] = [
    { key: 'title', header: 'Title', render: (t) => <button className="text-left font-medium text-content hover:text-brand-600" onClick={() => setOpenTask(t)}>{t.title}</button> },
    { key: 'assignees', header: 'Assignees', render: (t) => <AvatarStack names={t.assignees} max={3} size="xs" /> },
    { key: 'priority', header: 'Priority', render: (t) => <StatusBadge status={t.priority} size="sm" tone={t.priority === 'Urgent' ? 'danger' : 'neutral'} /> },
    { key: 'due', header: 'Due', render: (t) => (t.dueDate ? <DateBadge date={t.dueDate} /> : '—') },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
  ];

  const tabs: TabItem[] = [
    { value: 'board', label: 'Board' },
    { value: 'tasks', label: 'Tasks', count: tasks.length },
    { value: 'team', label: 'Team', count: team.length },
    { value: 'time', label: 'Time' },
    { value: 'financials', label: 'Financials' },
    { value: 'files', label: 'Files' },
    { value: 'activity', label: 'Activity' },
  ];

  return (
    <div>
      <button onClick={() => navigate(routes.projects)} className="mb-3 flex items-center gap-1.5 text-sm text-content-muted hover:text-content">
        <ArrowLeft size={16} /> Back to Projects
      </button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 font-display text-2xl font-bold text-content">
            {project.name}<StatusBadge status={project.status} />
          </h1>
          <p className="mt-1 text-sm text-content-muted">
            <span className="nums">{project.code}</span> · <button className="text-brand-600 hover:underline" onClick={() => navigate(routes.client(project.clientId))}>{project.clientName}</button>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={Pencil} onClick={() => setEditOpen(true)}>Edit Project</Button>
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>New Task</Button>
          <DropdownMenu trigger={<Button variant="outline" icon={MoreHorizontal} aria-label="More" />} items={[{ label: 'Archive' }, { label: 'Duplicate' }]} />
        </div>
      </div>

      <Tabs items={tabs} value={tab} onChange={setTab} className="mb-6" />

      {tab === 'board' && (tasks.length === 0 ? <EmptyState icon={Plus} title="No tasks yet" description="Add the first task to this project." action={<Button icon={Plus} onClick={() => setCreateOpen(true)}>New Task</Button>} /> : <TaskBoard tasks={tasks} onOpen={setOpenTask} onStatusChange={onStatusChange} />)}
      {tab === 'tasks' && <DataTable data={tasks} columns={taskCols} rowKey={(t) => t.id} onRowClick={(t) => setOpenTask(t)} empty={<EmptyState icon={Plus} title="No tasks" size="sm" />} />}

      {tab === 'team' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((name) => {
            const assigned = tasks.filter((t) => t.assignees.includes(name));
            return (
              <Card key={name}>
                <div className="flex items-center gap-3">
                  <Avatar name={name} size="md" />
                  <div><p className="font-semibold text-content">{name}</p><p className="text-xs text-content-muted">{assigned.length} tasks · {assigned.reduce((s, t) => s + t.hoursLogged, 0)}h</p></div>
                </div>
              </Card>
            );
          })}
          {team.length === 0 && <EmptyState icon={Users} title="No team members" size="sm" className="sm:col-span-2 lg:col-span-3" />}
        </div>
      )}

      {tab === 'time' && (
        <Card><CardTitle className="mb-2">Time Logged</CardTitle><p className="nums text-3xl font-bold text-content">{hours}h</p><p className="text-sm text-content-muted">Across {tasks.length} tasks.</p></Card>
      )}

      {tab === 'financials' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card><CardTitle className="mb-3">Budget</CardTitle><p className="nums text-2xl font-bold">{project.budget ? money(project.budget) : 'N/A'}</p>{project.budget && <ProgressBar className="mt-3" value={spentPct} autoTone />}</Card>
          <Card><CardTitle className="mb-3">Spent</CardTitle><p className="nums text-2xl font-bold">{money(project.spent)}</p><p className="mt-1 text-sm text-content-muted">{spentPct}% of budget</p></Card>
          <Card><CardTitle className="mb-3">Margin</CardTitle><p className={cn('nums text-2xl font-bold', margin >= 0 ? 'text-success-strong' : 'text-danger')}>{money(margin)}</p></Card>
        </div>
      )}

      {tab === 'files' && <EmptyState icon={FolderArchive} title="No files" description="Project documents will appear here." />}
      {tab === 'activity' && (
        <Card>
          <CardTitle className="mb-4">Activity</CardTitle>
          <ol className="relative space-y-3 border-l border-line pl-5 text-sm">
            {['Project created', 'Status changed to Active', 'Tasks added'].map((e, i) => (
              <li key={i} className="relative"><span className="absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-brand-500" /><p className="text-content">{e}</p><p className="text-2xs text-content-subtle">{formatDate(project.startDate)}</p></li>
            ))}
          </ol>
        </Card>
      )}

      <TaskDetailModal task={openTask} onClose={() => setOpenTask(null)} />
      <CreateTaskModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {project && <CreateProjectModal open={editOpen} onClose={() => setEditOpen(false)} project={project} />}
    </div>
  );
}
