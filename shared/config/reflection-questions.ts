import type { ReflectionPeriod } from '@/entities/journal/model/types';
import { REFLECTION_PERIODS } from '@/entities/journal/model/types';

export interface ReflectionQuestionDefinition {
  period: ReflectionPeriod;
  sortOrder: number;
  textRu: string;
  textEn: string;
  enabled: boolean;
}

export type ReflectionQuestionCatalog = Record<
  ReflectionPeriod,
  ReflectionQuestionDefinition[]
>;

export const DEFAULT_REFLECTION_QUESTION_COUNT = 10;

const DEFAULT_QUESTION_TEXT: Record<
  ReflectionPeriod,
  { ru: string[]; en: string[] }
> = {
  day: {
    ru: [
      'Какой момент сегодня запомнился больше всего?',
      'За что я благодарен сегодня?',
      'Что было сложным или вызывало напряжение?',
      'Чему я научился сегодня?',
      'Как я позаботился о себе?',
      'Кто или что принёс радость?',
      'Что я сделал бы иначе?',
      'Чем я горжусь?',
      'На чём хочу сосредоточиться завтра?',
      'Как бы я описал своё настроение и уровень энергии?',
    ],
    en: [
      'What moment stood out most today?',
      'What am I grateful for today?',
      'What was difficult or stressful?',
      'What did I learn today?',
      'How did I take care of myself?',
      'Who or what brought joy?',
      'What would I do differently?',
      'What am I proud of?',
      'What do I want to focus on tomorrow?',
      'How would I describe my mood and energy level?',
    ],
  },
  week: {
    ru: [
      'Каким был главный итог недели?',
      'За что я благодарен на этой неделе?',
      'Какие вызовы я преодолел?',
      'Чему я научился за неделю?',
      'Как я заботился о балансе и отдыхе?',
      'Какие отношения или моменты были особенно ценными?',
      'Что стоит улучшить на следующей неделе?',
      'Чем я горжусь за эту неделю?',
      'Какой главный фокус на следующую неделю?',
      'Как изменилось моё состояние к концу недели?',
    ],
    en: [
      'What was the main takeaway of the week?',
      'What am I grateful for this week?',
      'What challenges did I overcome?',
      'What did I learn this week?',
      'How did I maintain balance and rest?',
      'Which relationships or moments were especially meaningful?',
      'What should I improve next week?',
      'What am I proud of this week?',
      'What is my main focus for next week?',
      'How did my state change by the end of the week?',
    ],
  },
  month: {
    ru: [
      'Каким был главный итог месяца?',
      'За что я благодарен в этом месяце?',
      'С какими трудностями я столкнулся?',
      'Какие ключевые уроки я вынес?',
      'Как я заботился о здоровье и ресурсе?',
      'Какие достижения или радостные события были важны?',
      'Что не сработало и почему?',
      'Чем я горжусь за месяц?',
      'Какие цели ставлю на следующий месяц?',
      'Как изменился мой внутренний фон за месяц?',
    ],
    en: [
      'What was the main takeaway of the month?',
      'What am I grateful for this month?',
      'What difficulties did I face?',
      'What key lessons did I learn?',
      'How did I care for my health and energy?',
      'Which achievements or joyful events mattered most?',
      "What didn't work and why?",
      'What am I proud of this month?',
      'What goals am I setting for next month?',
      'How did my inner state change over the month?',
    ],
  },
  year: {
    ru: [
      'Каким был этот год в целом?',
      'За что я благодарен за год?',
      'Какие главные трудности были?',
      'Какие уроки года самые ценные?',
      'Как я менялся и рос?',
      'Какие люди и события повлияли на меня сильнее всего?',
      'Что бы я сделал иначе?',
      'Чем я горжусь за год?',
      'Какое намерение беру в новый цикл?',
      'Какое слово или образ описывает мой год?',
    ],
    en: [
      'How was this year overall?',
      'What am I grateful for this year?',
      'What were the main difficulties?',
      'What are the most valuable lessons of the year?',
      'How did I grow and change?',
      'Which people and events influenced me most?',
      'What would I do differently?',
      'What am I proud of this year?',
      'What intention am I taking into the next cycle?',
      'What word or image describes my year?',
    ],
  },
};

export function getDefaultReflectionQuestions(): ReflectionQuestionCatalog {
  return REFLECTION_PERIODS.reduce((acc, period) => {
    acc[period] = DEFAULT_QUESTION_TEXT[period].ru.map((textRu, sortOrder) => ({
      period,
      sortOrder,
      textRu,
      textEn: DEFAULT_QUESTION_TEXT[period].en[sortOrder] ?? textRu,
      enabled: true,
    }));
    return acc;
  }, {} as ReflectionQuestionCatalog);
}

export function getEnabledReflectionQuestions(
  catalog: ReflectionQuestionCatalog,
  period: ReflectionPeriod
): ReflectionQuestionDefinition[] {
  return catalog[period]
    .filter((question) => question.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getReflectionQuestionText(
  question: ReflectionQuestionDefinition,
  locale: string
): string {
  return locale === 'ru' ? question.textRu : question.textEn;
}
