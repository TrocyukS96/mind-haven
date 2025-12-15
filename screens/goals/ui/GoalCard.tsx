'use client';

import { Goal } from "@/entities/goal/model/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Brain, Calendar, Edit, MoreVertical, Plus, Target, Trash2 } from "lucide-react";
import { getProgressColor } from "../libs/get-progress-color";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import { TaskCard } from "@/entities/task";
import { useStore } from "@/shared/store/store-config";
import { useState } from "react";
import { toast } from 'react-toastify';

interface Props {
    goal: Goal;
}

const GoalCard = ({ goal }: Props) => {
    const { openTaskForm, deleteGoal, openGoalForm } = useStore();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    return (
        <>
            <Card className="hover:shadow-lg transition-shadow relative group">
                <CardContent className="p-4">
                    <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 pr-8">
                                <h3 className="text-lg font-semibold mb-2">{goal.title}</h3>
                                <p className="text-muted-foreground text-sm line-clamp-2">
                                    {goal.description}
                                </p>
                            </div>
                            <div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={() => openGoalForm(goal)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Редактировать
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => setIsDeleteOpen(true)}
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
                                <Calendar size={16} className="text-primary" />
                                <span>{new Date(goal.deadline).toLocaleDateString('ru-RU')}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                                <Target size={20} className="text-primary" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 space-y-2">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold">Шаги к цели</h4>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openTaskForm(undefined, goal.id)}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {goal.tasks.map((task) => (
                                <TaskCard key={task.id} task={task}  />
                            ))}
                            {goal.tasks.length === 0 && (
                                <p className="text-sm text-muted-foreground italic">
                                    Нет шагов. Добавь первый!
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Подтверждение удаления цели */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить цель?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ты уверен, что хочешь удалить цель "<strong>{goal.title}</strong>"? Это действие нельзя отменить.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            deleteGoal(goal.id);
                            toast.success('Цель удалена');
                        }} className="bg-destructive text-destructive-foreground">
                            Удалить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default GoalCard;