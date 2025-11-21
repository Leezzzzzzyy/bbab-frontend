import colors from "@/assets/colors";
import { AuthBullets } from "@/components/auth/AuthBullets";
import { AuthCarousel } from "@/components/auth/AuthCarousel";
import { Step1 } from "@/components/auth/steps/Step1";
import { Step2 } from "@/components/auth/steps/Step2";
import { Step3 } from "@/components/auth/steps/Step3";
import { PhoneProvider } from "@/context/PhoneContext";
import { useAuthSteps } from "@/hooks/auth/useAuthSteps";
import React from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function authHandler() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { currentStep, nextStep, prevStep, totalSteps } = useAuthSteps();

  const steps = [
    <Step1 onNext={nextStep} key="step1" />,
    <Step2 onNext={nextStep} onBack={prevStep} key="step2" />,
    <Step3 onBack={prevStep} key="step3" />,
  ];

  return (
    <GestureHandlerRootView>
      <PhoneProvider>
        <View
          style={{
            flex: 1,
            position: "relative",
            backgroundColor: colors.background,
          }}
        >
          <AuthCarousel currentIndex={currentStep}>{steps}</AuthCarousel>
          <AuthBullets currentStep={currentStep} totalSteps={totalSteps} />
        </View>
      </PhoneProvider>
    </GestureHandlerRootView>
  );
}
