import { Task, TaskPriority } from '@/entities/task/model/types';
import { StateCreator } from 'zustand';
import { AppStore } from '../store-config';

export interface TasksSlice {
    tasks: Task[];
    selectedTask: Task | null;
    isTaskFormOpen: boolean;
    defaultGoalId?: string;

    addTask: (title: string, goalId?: string, priority?: TaskPriority) => void;
    toggleTask: (id: string) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (task: Task) => void;
    openTaskForm: (task?: Task, goalId?: string) => void;
    closeTaskForm: () => void;
}

const calculateProgress = (subtasks: Task[]) => {
    if (subtasks.length === 0) return 0;
    return Math.round(
        subtasks.reduce((acc, t) => acc + (t.completed ? 100 : 20), 0) / subtasks.length
    );
};

export const createTasksSlice: StateCreator<AppStore, [], [], TasksSlice> = (set, get,) => ({
    tasks: [],
    selectedTask: null,
    isTaskFormOpen: false,
    defaultGoalId: undefined,
    addTask: (title, goalId, priority = 'medium') => {
        const newTask: Task = {
            id: Date.now().toString(),
            title: title.trim(),
            completed: false,
            priority,
            goalId,
            createdAt: new Date().toISOString(),
        };

        set((state) => ({
            tasks: [...state.tasks, newTask],
        }));

        if (goalId) {
            set((state) => {
                const goal = state.goals.find((g) => g.id === goalId);
                if (!goal) return state;

                const tasks = [...goal.tasks, newTask];
                const progress = calculateProgress(tasks);

                return {
                    goals: state.goals.map((g) =>
                        g.id === goalId ? { ...g, tasks, progress } : g
                    ),
                };
            });
        }
    },

    toggleTask: (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;

        const toggledTask = {
            ...task,
            completed: !task.completed,
            completedAt: !task.completed ? new Date().toISOString() : undefined,
        };

        set({ tasks: get().tasks.map((t) => (t.id === id ? toggledTask : t)) });

        if (task.goalId) {
            set((state) => {
                const goal = state.goals.find((g) => g.id === task.goalId!);
                if (!goal) return state;

                const tasks = goal.tasks.map((t) =>
                    t.id === id ? toggledTask : t
                );
                const progress = calculateProgress(tasks);

                return {
                    goals: state.goals.map((g) =>
                        g.id === task.goalId ? { ...g, tasks, progress } : g
                    ),
                };
            });
        }
    },

    deleteTask: (task: Task) => {
        set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== task.id),
        }))

        if (task.goalId) {
            set((state) => {
                const goal = state.goals.find((g) => g.id === task.goalId!);
                if (!goal) return state;

                const tasks = goal.tasks.filter((t) => t.id !== task.id);
                const progress = calculateProgress(tasks);

                return {
                    goals: state.goals.map((g) =>
                        g.id === task.goalId ? { ...g, tasks, progress } : g
                    ),
                };
            });
        }

    },

    updateTask: (id, updates) =>
        set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

    openTaskForm: (task, goalId) =>{
        console.log(goalId,'goalId');
        set({
            selectedTask: task || null,
            isTaskFormOpen: true,
            defaultGoalId: goalId,
        });
    },
    closeTaskForm: () =>
        set({
            selectedTask: null,
            isTaskFormOpen: false,
            defaultGoalId: undefined,
        }),

});