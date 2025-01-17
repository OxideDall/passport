import { useState } from "react";
import { WelcomeWrapper } from "./WelcomeWrapper";
import { useNavigate } from "react-router-dom";

const welcomeSteps = [
  {
    header: "Welcome to Gitcoin Passport!",
    subHeader: "Privacy-First Verification",
    body: "The non-doxxing identity aggregator that combines multiple sybil prevention mechanisms to prove your unique humanity and build your reputation.",
    imgSrc: "",
  },
  {
    header: "Introducing Passport Scoring",
    subHeader: "Get Your Unique Humanity Score",
    body: "Think of your score as a trampoline that launches you to your destination. As your score increases, communities more easily trust that you are a unique human.",
    imgSrc: "",
  },
  {
    header: "Get Started",
    subHeader: "One-Click Verification",
    body: "You can now verify most web3 stamps with one-click verification! For Web2 stamps, please verify them through your Passport dashboard, and we encourage you to collect as many stamps as possible.",
    imgSrc: "",
  },
];

const stepIndicator = (step: number) => {
  const steps = welcomeSteps.map((_, i) => {
    const active = i === step ? "border-4 border-muted h-4 w-4" : "w-2.5 h-2.5 mt-0.5";
    return <div key={i} className={`mx-4 rounded-full bg-accent ${active}`} />;
  });
  return <div className="ml-3 flex justify-center">{steps}</div>;
};

export const InitialWelcome = ({ onBoardFinished }: { onBoardFinished: () => void }) => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  return (
    <WelcomeWrapper content={welcomeSteps[step]}>
      <div className="flex w-full flex-col">
        <div className="mb-5 flex w-full items-center justify-center">
          Step {step + 1} of {welcomeSteps.length} {stepIndicator(step)}
        </div>
        <div className="flex w-full justify-end">
          {step === 2 && (
            <button
              className="secondary-btn mr-2  w-1/2 rounded-sm py-2 px-6"
              onClick={() => {
                setStep(0);
                navigate("/dashboard");
              }}
            >
              Skip For Now
            </button>
          )}
          <button
            className="ml-2 w-1/2 rounded-sm bg-accent py-2 px-6"
            onClick={() => {
              if (step + 1 === welcomeSteps.length) {
                onBoardFinished();
              } else {
                setStep(step + 1);
              }
            }}
          >
            Next
          </button>
        </div>
      </div>
    </WelcomeWrapper>
  );
};
