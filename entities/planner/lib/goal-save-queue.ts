const goalSaves = new Map<string, Promise<void>>();

export function trackGoalSave(id: string, pending: Promise<void>) {
  const tracked = pending.finally(() => {
    if (goalSaves.get(id) === tracked) {
      goalSaves.delete(id);
    }
  });

  goalSaves.set(id, tracked);
  return tracked;
}

export function waitForGoalSave(id?: string): Promise<void> {
  if (!id) return Promise.resolve();
  return goalSaves.get(id) ?? Promise.resolve();
}
