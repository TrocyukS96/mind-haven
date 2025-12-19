import { Goal } from "@/entities/goal/model/types";
import GoalCard from "./GoalCard";
import GoalsEmptyState from "./GoalsEmtyState";

const GoalsList = ({ filteredGoals }: { filteredGoals: Goal[] }) => {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredGoals.map((goal) => (
                    <GoalCard
                        goal={goal}
                        key={goal.id}
                    />
                ))}
            </div>
            {filteredGoals.length === 0 && <GoalsEmptyState />}
        </>
    );
};

export default GoalsList;