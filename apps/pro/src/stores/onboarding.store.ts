import { create } from "zustand";
import type {
  OnboardingStep2Input,
  OnboardingStep3Input,
  OnboardingStep4Input,
} from "@mechago/shared";

// Store Zustand para dados temporários do onboarding de 4 etapas.
// Os dados só são enviados ao backend no submit do Passo 4.
// Após o registro bem-sucedido, o estado é limpo via reset().
interface OnboardingState {
  step2: Partial<OnboardingStep2Input>;
  step3: Partial<OnboardingStep3Input>;
  step4: Partial<OnboardingStep4Input>;

  setStep2: (data: OnboardingStep2Input) => void;
  setStep3: (data: OnboardingStep3Input) => void;
  setStep4: (data: OnboardingStep4Input) => void;

  // Retorna os dados consolidados de step2+3+4 para o submit final
  getRegistrationData: () => {
    type: OnboardingStep2Input["type"];
    specialties: OnboardingStep3Input["specialties"];
    vehicleTypesServed: OnboardingStep3Input["vehicleTypesServed"];
    radiusKm: OnboardingStep4Input["radiusKm"];
    scheduleType: OnboardingStep4Input["scheduleType"];
  } | null;

  // Limpa o estado após registro bem-sucedido
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  step2: {},
  step3: {},
  step4: {},

  setStep2: (data) => set({ step2: data }),
  setStep3: (data) => set({ step3: data }),
  setStep4: (data) => set({ step4: data }),

  getRegistrationData: () => {
    const { step2, step3, step4 } = get();

    // Validação: todos os campos obrigatórios devem estar preenchidos
    if (
      !step2.type ||
      !step3.specialties?.length ||
      !step3.vehicleTypesServed?.length ||
      step4.radiusKm === undefined ||
      !step4.scheduleType
    ) {
      return null;
    }

    return {
      type: step2.type,
      specialties: step3.specialties,
      vehicleTypesServed: step3.vehicleTypesServed,
      radiusKm: step4.radiusKm,
      scheduleType: step4.scheduleType,
    };
  },

  reset: () => set({ step2: {}, step3: {}, step4: {} }),
}));
