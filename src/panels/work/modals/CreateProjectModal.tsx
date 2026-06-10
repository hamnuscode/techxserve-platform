import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Modal, toast } from '@ds/feedback';
import { Button, Input, Select, FormField } from '@ds/primitives';
import { clientsApi } from '@/data/mock-api';
import { qk } from '@/data/query-keys';
import { useProjectMutations } from '../hooks';
import type { Project } from '@/types';

type FormValues = { name: string; clientId: string; managerName: string; billingModel: Project['billingModel']; status: Project['status']; budget: number; startDate: string; endDate: string };

export function CreateProjectModal({ open, onClose, project }: { open: boolean; onClose: () => void; project?: Project }) {
  // Client list comes from the shared data layer (panels never import each other).
  const { data: clients } = useQuery({ queryKey: qk.clients({ pageSize: 1000, status: 'Active' }), queryFn: () => clientsApi.list({ pageSize: 1000, status: 'Active' }) });
  const { create, update } = useProjectMutations();
  const editing = !!project;
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { billingModel: 'Fixed', status: 'Lead', startDate: new Date().toISOString().slice(0, 10) },
  });

  useEffect(() => {
    if (project) reset({
      name: project.name, clientId: project.clientId, managerName: project.managerName,
      billingModel: project.billingModel, status: project.status, budget: project.budget ?? 0,
      startDate: project.startDate, endDate: project.endDate,
    });
  }, [project, reset]);

  const onSubmit = handleSubmit(async (v) => {
    const data = { ...v, budget: v.budget ? Number(v.budget) : null, currency: 'PKR' as const };
    if (editing) { await update.mutateAsync({ id: project!.id, data }); toast.success('Project updated'); }
    else { await create.mutateAsync(data); toast.success('Project created'); reset(); }
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Project' : 'Create Project'} size="md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={create.isPending || update.isPending} onClick={onSubmit}>{editing ? 'Save Changes' : 'Create Project'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Project Name" required className="sm:col-span-2"><Input placeholder="Website Revamp" {...register('name')} /></FormField>
        <FormField label="Client"><Select placeholder="Select client…" options={(clients?.rows ?? []).map((c) => ({ value: c.id, label: c.name }))} {...register('clientId')} /></FormField>
        <FormField label="Manager"><Input placeholder="Manager name" {...register('managerName')} /></FormField>
        <FormField label="Billing Model"><Select options={['Fixed', 'T&M', 'Retainer'].map((b) => ({ value: b, label: b }))} {...register('billingModel')} /></FormField>
        <FormField label="Status"><Select options={['Lead', 'Active', 'On Hold', 'Completed'].map((s) => ({ value: s, label: s }))} {...register('status')} /></FormField>
        <FormField label="Budget"><Input type="number" placeholder="0" {...register('budget')} /></FormField>
        <FormField label="Start Date"><Input type="date" {...register('startDate')} /></FormField>
        <FormField label="End Date" className="sm:col-span-2"><Input type="date" {...register('endDate')} /></FormField>
      </div>
    </Modal>
  );
}
