import { SignUp } from "@clerk/react-router";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="space-y-4">
        <SignUp 
          afterSignUpUrl="/onboarding"
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}
