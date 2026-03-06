import { kv } from '@vercel/kv';

const PROJECTS_KEY = 'nbl:projects';

export async function getAllProjects() {
  const projects = await kv.get(PROJECTS_KEY);
  return projects || [];
}

export async function saveProject(project) {
  const projects = await getAllProjects();
  projects.push(project);
  await kv.set(PROJECTS_KEY, projects);
  return project;
}

export async function markReminderSent(projectId, reminderType) {
  const projects = await getAllProjects();
  const updated = projects.map(p => {
    if (p.id === projectId) {
      return {
        ...p,
        reminders: { ...p.reminders, [reminderType]: new Date().toISOString() }
      };
    }
    return p;
  });
  await kv.set(PROJECTS_KEY, updated);
}

export async function markReviewComplete(projectId) {
  const projects = await getAllProjects();
  const updated = projects.map(p =>
    p.id === projectId ? { ...p, reviewComplete: true } : p
  );
  await kv.set(PROJECTS_KEY, updated);
}
