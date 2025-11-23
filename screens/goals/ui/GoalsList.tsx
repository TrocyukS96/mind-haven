import { Goal } from "@/entities/goal/model/types";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Plus, Target } from "lucide-react";
import GoalCard from "./GoalCard";

const GoalsList = ({ filteredGoals, setIsCreating }: { filteredGoals: Goal[]; setIsCreating: (isCreating: boolean) => void }) => {

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                ))}
            </div>
            {filteredGoals.length === 0 && (
                <Card>
                    <CardContent className="p-12">
                        <div className="text-center">
                            <Target size={48} className="mx-auto text-muted-foreground mb-4" />
                            <h3 className="mb-2">Нет целей в этой категории</h3>
                            <p className="text-muted-foreground mb-4">
                                Создай свою первую цель, чтобы начать путь к успеху
                            </p>
                            <Button onClick={() => setIsCreating(true)}>
                                <Plus size={20} />
                                Создать цель
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </>
    );
};

export default GoalsList;