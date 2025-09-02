import { useState } from "react";

export const useAuthSteps = () => {
  const totalSteps: number = 3;

  const [currentStep, setCurrentStep] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState("");

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

  const setNumber = (phone: string) => {
    if (!phone) {
      return new Error("Phone number is empty");
    }
    setPhoneNumber(phone);
  };

  return {
    currentStep,
    totalSteps,
    phoneNumber,
    nextStep,
    prevStep,
    setNumber,
  };
};
