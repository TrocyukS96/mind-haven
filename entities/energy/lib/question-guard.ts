export class EnergyQuestionInUseError extends Error {
  constructor() {
    super('Energy question is used by historical check-ins and cannot be deleted');
    this.name = 'EnergyQuestionInUseError';
  }
}

export function canDeleteEnergyQuestion(historicalAnswerCount: number): boolean {
  return historicalAnswerCount <= 0;
}

export function assertEnergyQuestionCanBeDeleted(historicalAnswerCount: number): void {
  if (!canDeleteEnergyQuestion(historicalAnswerCount)) {
    throw new EnergyQuestionInUseError();
  }
}
