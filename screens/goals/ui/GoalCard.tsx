'use client';

import { Card, CardContent } from "@/shared/ui/card";
import { Target, MoreVertical, Edit, Trash2, Brain } from "lucide-react";
import { getProgressColor } from "../libs/get-progress-color";
import { Button } from "@/shared/ui/button";
import { Calendar, TrendingUp } from "lucide-react";
import { Goal } from "@/entities/goal/model/types";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import { toast } from 'react-toastify';

interface Props {
    goal: Goal;
    onEdit?: (goal: Goal) => void;
    onDelete?: (id: string) => void;
}

const GoalCard = ({ goal, onEdit, onDelete }: Props) => {
    return (
        <Card className="hover:shadow-lg transition-shadow relative group">
            <CardContent className="p-6">
                <div className="space-y-4">
                    {/* Меню */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => onEdit?.(goal)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Редактировать
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => onDelete?.(goal.id)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Удалить
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        toast.info("Этот функционал ещё не реализован", {
                                            icon: <Brain className="h-4 w-4" />,
                                            className: "border border-border",
                                        });
                                    }}
                                >
                                    <Brain className="mr-2 h-4 w-4" />
                                    Анализировать
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Остальной контент карточки */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 pr-8">
                            <h3 className="text-lg font-semibold mb-2">{goal.title}</h3>
                            <p className="text-muted-foreground text-sm line-clamp-2">
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
                                className="h-full transition-all duration-500"
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
                            <TrendingUp size={16} className="mr-2" />
                            Обновить
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default GoalCard;