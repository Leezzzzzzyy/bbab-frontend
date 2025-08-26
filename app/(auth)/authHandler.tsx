import colors from "@/assets/colors";
import { Step4 } from "@/components/auth//steps/Step4";
import { AuthBullets } from "@/components/auth/AuthBullets";
import { AuthCarousel } from "@/components/auth/AuthCarousel";
import { Step1 } from "@/components/auth/steps/Step1";
import { Step2 } from "@/components/auth/steps/Step2";
import { Step3 } from "@/components/auth/steps/Step3";
import { useAuthSteps } from "@/hooks/auth/useAuthSteps";
import { View } from "react-native";

export default function authHandler() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { currentStep, nextStep, prevStep, totalSteps } = useAuthSteps(4);

  const steps = [
    <Step1 onNext={nextStep} key="step1" />,
    <Step2 onNext={nextStep} onBack={prevStep} key="step2" />,
    <Step3 onNext={nextStep} onBack={prevStep} key="step3" />,
    <Step4 onBack={prevStep} key="step4" />,
  ];

  return (
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
  );
}
