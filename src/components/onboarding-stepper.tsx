import { Check } from "lucide-react";
import { ConnectBankButton } from "./connect-bank-button";
import { SyncButton } from "./sync-button";
import { getSignInUrl } from "@/lib/api";

interface OnboardingStepperProps {
  sessionToken: string | null;
  subscriptionStatus: string;
  connectionsCount: number;
  accountsCount: number;
}

const steps = [
  {
    title: "Sign in with GitHub",
    description: "Authenticate to get started.",
  },
  {
    title: "Subscribe",
    description: "Start your $5/month subscription to unlock bank connections.",
  },
  {
    title: "Connect bank account",
    description: "Securely link your bank account through Plaid.",
  },
  {
    title: "Sync account",
    description: "Pull in your accounts, balances, and transactions.",
  },
];

export function OnboardingStepper({
  sessionToken,
  subscriptionStatus,
  connectionsCount,
  accountsCount,
}: OnboardingStepperProps) {
  const isSignedIn = sessionToken !== null;
  const isSubscribed = subscriptionStatus === "active";

  const completed = [
    isSignedIn,
    isSubscribed,
    connectionsCount > 0,
    accountsCount > 0,
  ];

  const currentStep = completed.indexOf(false);

  return (
    <div className="border border-border rounded-xl p-8 bg-card">
      <h2 className="text-xl font-semibold mb-6">Get started</h2>
      <div className="space-y-0">
        {steps.map((step, i) => {
          const isCompleted = completed[i];
          const isCurrent = i === currentStep;
          const isFuture = !isCompleted && !isCurrent;
          const isLast = i === steps.length - 1;

          return (
            <div key={step.title} className="flex gap-4">
              {/* Circle + line column */}
              <div className="flex flex-col items-center">
                {isCompleted ? (
                  <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
                ) : isCurrent ? (
                  <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium">{i + 1}</span>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                  </div>
                )}
                {!isLast && (
                  <div
                    className={`w-px flex-1 min-h-6 ${
                      isCompleted ? "bg-success" : "bg-border"
                    }`}
                  />
                )}
              </div>

              {/* Content column */}
              <div className={`pb-8 ${isLast ? "pb-0" : ""}`}>
                <p
                  className={`font-medium ${
                    isFuture ? "text-muted-foreground" : ""
                  }`}
                >
                  {step.title}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    isFuture
                      ? "text-muted-foreground/60"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.description}
                </p>
                {isCurrent && (
                  <div className="mt-3">
                    {i === 0 && (
                      <a
                        href={getSignInUrl()}
                        className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        Sign in with GitHub
                      </a>
                    )}
                    {i === 1 && (
                      <ConnectBankButton
                        sessionToken={sessionToken}
                        subscriptionStatus={subscriptionStatus}
                      />
                    )}
                    {i === 2 && (
                      <ConnectBankButton
                        sessionToken={sessionToken}
                        subscriptionStatus={subscriptionStatus}
                      />
                    )}
                    {i === 3 && <SyncButton />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
