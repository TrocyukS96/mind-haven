import type { EnergyQuestionDefinition } from '../model/types';

export function getEnergyQuestionCopy(
  question: EnergyQuestionDefinition,
  locale: string
) {
  const isRussian = locale === 'ru';

  return {
    text: isRussian ? question.textRu : question.textEn,
    minLabel: isRussian ? question.minLabelRu : question.minLabelEn,
    midLabel: isRussian ? question.midLabelRu : question.midLabelEn,
    maxLabel: isRussian ? question.maxLabelRu : question.maxLabelEn,
  };
}
