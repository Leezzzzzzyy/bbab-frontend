import { useState } from "react";

export const useAuthSteps = (totalSteps: number) => {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return {
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
  };
};
