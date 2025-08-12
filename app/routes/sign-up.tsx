import { SignUp } from "@clerk/react-router";
import { useSearchParams } from "react-router";

export default function SignUpPage() {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/onboarding';

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="space-y-4">
        <SignUp 
          afterSignUpUrl={redirectUrl}
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}
