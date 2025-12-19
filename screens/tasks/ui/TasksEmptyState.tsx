import { useStore } from "@/shared/store/store-config";
import { EmptyState } from "@/shared/ui/empty-state";
import { CheckSquare } from "lucide-react";

const TasksEmptyState = () => {
    const openTaskForm = useStore((state) => state.openTaskForm);
    return (
        <EmptyState
            icon={CheckSquare}
            title="Нет задач"
            description="Создайте первую задачу"
            actionLabel="Создать задачу"
            onAction={openTaskForm}
            compact={true}
        />
    );
};

export default TasksEmptyState;