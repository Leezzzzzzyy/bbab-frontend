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

  // Рендерим только текущий шаг
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <Step1 key="step1" onNext={nextStep} />;
      case 1:
        return <Step2 key="step2" onNext={nextStep} onBack={prevStep} />;
      case 2:
        return <Step3 key="step3" onBack={prevStep} />;
      default:
        return <Step1 key="step1" onNext={nextStep} />;
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PhoneProvider>
        <View
          style={{
            flex: 1,
            position: "relative",
            backgroundColor: colors.background,
          }}
        >
          <AuthCarousel currentIndex={currentStep}>
            {renderCurrentStep()}
          </AuthCarousel>
          <AuthBullets currentStep={currentStep} totalSteps={totalSteps} />
        </View>
      </PhoneProvider>
    </GestureHandlerRootView>
  );
}
