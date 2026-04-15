import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { OnboardingDialog } from "@/components/onboarding/onboarding-dialog";
import { AuthEntryDialog } from "@/components/shared/auth-entry-dialog";
import { BindEmailDialog } from "@/components/shared/bind-email-dialog";
import { EmailLoginDialog } from "@/components/shared/email-login-dialog";

export default function Home() {
  return (
    <>
      <AuthEntryDialog />
      <OnboardingDialog />
      <BindEmailDialog />
      <EmailLoginDialog />
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <DashboardOverview />
      </main>
    </>
  );
}
