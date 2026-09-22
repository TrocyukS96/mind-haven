import type {
  EnergyAnswerInput,
  EnergyCheckIn,
  EnergyTestSnapshot,
} from '@/entities/energy/model/types';
import { buildActivityInput } from '@/entities/activity/lib/build-activity-input';
import { buildEnergyCheckIn } from '@/entities/energy/lib/calculate-energy';
import { getLatestEnergyCheckIn } from '@/entities/energy/lib/energy-history';
import {
  createEnergyCheckInRequest,
} from '@/entities/energy/api/energy-client';
import { shouldUseEnergyApi } from '@/entities/energy/lib/resolve-energy-api';
import { getDefaultEnergyTestSnapshot } from '@/shared/config/energy-test';
import { StateCreator } from 'zustand';
import type { AppStore } from '../store-config';

export interface EnergySlice {
  energyCheckIns: EnergyCheckIn[];
  energyTest: EnergyTestSnapshot;
  energyApiEnabled: boolean;
  isEnergyCheckInOpen: boolean;
  viewedEnergyCheckIn: EnergyCheckIn | null;

  setEnergyApiEnabled: (enabled: boolean) => void;
  hydrateEnergy: (params: {
    checkIns?: EnergyCheckIn[];
    test?: EnergyTestSnapshot;
  }) => void;
  openEnergyCheckIn: () => void;
  closeEnergyCheckIn: () => void;
  openEnergyResult: (checkIn: EnergyCheckIn) => void;
  closeEnergyResult: () => void;
  submitEnergyCheckIn: (answers: EnergyAnswerInput[]) => Promise<EnergyCheckIn>;
  getLatestEnergyCheckIn: () => EnergyCheckIn | null;
}

export const createEnergySlice: StateCreator<AppStore, [], [], EnergySlice> = (set, get) => ({
  energyCheckIns: [],
  energyTest: getDefaultEnergyTestSnapshot(),
  energyApiEnabled: false,
  isEnergyCheckInOpen: false,
  viewedEnergyCheckIn: null,

  setEnergyApiEnabled: (enabled) => set({ energyApiEnabled: enabled }),

  hydrateEnergy: ({ checkIns, test }) =>
    set((state) => ({
      energyCheckIns: checkIns ?? state.energyCheckIns,
      energyTest: test ?? state.energyTest,
    })),

  openEnergyCheckIn: () => set({ isEnergyCheckInOpen: true }),

  closeEnergyCheckIn: () => set({ isEnergyCheckInOpen: false }),

  openEnergyResult: (checkIn) => set({ viewedEnergyCheckIn: checkIn }),

  closeEnergyResult: () => set({ viewedEnergyCheckIn: null }),

  submitEnergyCheckIn: async (answers) => {
    if (await shouldUseEnergyApi()) {
      const checkIn = await createEnergyCheckInRequest(answers);
      set((state) => ({
        energyCheckIns: [checkIn, ...state.energyCheckIns.filter((item) => item.id !== checkIn.id)],
      }));
      return checkIn;
    }

    const checkIn = buildEnergyCheckIn({
      userId: 'guest',
      testVersion: get().energyTest,
      answers,
    });

    set((state) => ({
      energyCheckIns: [checkIn, ...state.energyCheckIns],
    }));

    void get().recordActivity(
      buildActivityInput({
        type: 'ENERGY_CHECK_IN_COMPLETED',
        entityId: checkIn.id,
        title: `${checkIn.score.toFixed(1)} / 10`,
        metadata: {
          score: checkIn.score,
          testVersionId: checkIn.testVersionId,
        },
        idempotencyKey: `energy:${checkIn.id}:completed`,
      })
    );

    return checkIn;
  },

  getLatestEnergyCheckIn: () => getLatestEnergyCheckIn(get().energyCheckIns),
});
