import { Goal } from "@/entities/goal/model/types";
import { Card, CardContent } from "@/shared/ui/card";
import { Calendar, Plus, Target, TrendingUp } from "lucide-react";
import { getProgressColor } from "../libs/get-progress-color";
import { Button } from "@/shared/ui/button";

const GoalsList = ({ filteredGoals, setIsCreating }: { filteredGoals: Goal[]; setIsCreating: (isCreating: boolean) => void }) => {

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredGoals.map((goal) => (
                    <Card key={goal.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="mb-2">{goal.title}</h3>
                                        <p className="text-muted-foreground text-sm">
                                            {goal.description}
                                        </p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                                        <Target size={20} className="text-primary" />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">Прогресс</span>
                                        <span className="text-sm font-medium">{goal.progress}%</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-300"
                                            style={{
                                                width: `${goal.progress}%`,
                                                backgroundColor: getProgressColor(goal.progress),
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-border">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar size={16} />
                                        <span>{new Date(goal.deadline).toLocaleDateString('ru-RU')}</span>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                        <TrendingUp size={16} />
                                        Обновить
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
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