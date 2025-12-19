'use client';

import { Goal } from "@/entities/goal/model/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Brain, Calendar, Clock, Edit, MoreVertical, Plus, Target, Trash2 } from "lucide-react";
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
import { getGoalStatus } from "@/shared/lib/goal-heplers";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";

interface Props {
    goal: Goal;
}

const GoalCard = ({ goal }: Props) => {
    const { openTaskForm, deleteGoal, openGoalForm } = useStore();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const status = getGoalStatus(goal.progress);

    const getTypeConfig = (type: Goal['type']) => {
        switch (type) {
            case 'short':
                return {
                    label: 'Краткосрочная',
                    icon: Clock,
                    color: 'text-blue-600 dark:text-blue-400',
                    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
                    borderColor: 'border-blue-200 dark:border-blue-800'
                };
            case 'medium':
                return {
                    label: 'Среднесрочная',
                    icon: Clock,
                    color: 'text-amber-600 dark:text-amber-400',
                    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
                    borderColor: 'border-amber-200 dark:border-amber-800'
                };
            case 'long':
                return {
                    label: 'Долгосрочная',
                    icon: Target,
                    color: 'text-purple-600 dark:text-purple-400',
                    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
                    borderColor: 'border-purple-200 dark:border-purple-800'
                };
            default:
                return {
                    label: 'Цель',
                    icon: Target,
                    color: 'text-gray-600 dark:text-gray-400',
                    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
                    borderColor: 'border-gray-200 dark:border-gray-800'
                };
        }
    };

    const typeConfig = getTypeConfig(goal.type);
    const TypeIcon = typeConfig.icon;

    return (
        <>
            <Card className="hover:shadow-lg transition-shadow duration-300 group border-border/50">
                <CardContent className="p-5">
                    <div className="space-y-4">
                        {/* Заголовок и меню */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                {/* Тип цели и статус в одной строке */}
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                        typeConfig.bgColor,
                                        typeConfig.borderColor,
                                        typeConfig.color
                                    )}>
                                        <TypeIcon className="h-3 w-3" />
                                        {typeConfig.label}
                                    </span>
                                    
                                    <Badge
                                        variant={
                                            status === 'completed'
                                                ? 'default'
                                                : status === 'on-track'
                                                    ? 'default'
                                                    : status === 'at-risk'
                                                        ? 'destructive'
                                                        : 'secondary'
                                        }
                                        className="text-xs font-medium"
                                    >
                                        {status === 'completed' && 'Завершена'}
                                        {status === 'on-track' && 'Иду по плану'}
                                        {status === 'at-risk' && 'Риск срыва'}
                                        {status === 'not-started' && 'Не начата'}
                                    </Badge>
                                </div>

                                {/* Заголовок цели */}
                                <h3 className="text-xl font-semibold text-foreground mb-2 break-words">
                                    {goal.title}
                                </h3>
                                
                                {/* Описание цели */}
                                {goal.description && (
                                    <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                                        {goal.description}
                                    </p>
                                )}
                            </div>
                            
                            {/* Меню действий */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => openGoalForm(goal)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Редактировать
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
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

                        {/* Прогресс бар */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">Прогресс</span>
                                <span className="text-sm font-semibold text-primary">{goal.progress}%</span>
                            </div>
                            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{
                                        width: `${goal.progress}%`,
                                        backgroundColor: getProgressColor(goal.progress),
                                    }}
                                />
                            </div>
                        </div>

                        {/* Дедлайн и иконка цели */}
                        <div className="flex items-center justify-between pt-3 border-t border-border/50">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar size={16} className="text-primary" />
                                <span className="font-medium">
                                    {new Date(goal.deadline).toLocaleDateString('ru-RU', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                            <div className="p-2 rounded-full bg-primary/10">
                                <Target size={20} className="text-primary" />
                            </div>
                        </div>
                    </div>

                    {/* Секция задач */}
                    <div className="mt-6 pt-5 border-t border-border/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-base font-semibold text-foreground">Шаги к цели</h4>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openTaskForm(undefined, goal.id)}
                                className="h-8 px-3"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                Добавить
                            </Button>
                        </div>

                        <div className="space-y-2.5">
                            {goal.tasks.map((task) => (
                                <TaskCard key={task.id} task={task} />
                            ))}
                            {goal.tasks.length === 0 && (
                                <div className="py-4 text-center">
                                    <p className="text-sm text-muted-foreground italic">
                                        Ещё нет шагов. Добавьте первый!
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Диалог удаления */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-destructive" />
                            Удалить цель?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="pt-2">
                            Вы уверены, что хотите удалить цель
                            <span className="font-semibold text-foreground mx-1">"{goal.title}"</span>?
                            Это действие нельзя отменить и будут удалены все связанные задачи.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => {
                                deleteGoal(goal.id);
                                toast.success('Цель удалена');
                            }} 
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                            Удалить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default GoalCard;