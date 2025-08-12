import { SignIn } from "@clerk/react-router";
import { useSearchParams } from "react-router";

export default function SignInPage() {
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role");
  const redirectUrl = searchParams.get('redirect_url');

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="space-y-4">
        {role && (
          <div className="text-center mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700">
              Signing in as: <span className="font-semibold capitalize">{role}</span>
            </p>
          </div>
        )}
        <SignIn 
          signUpUrl={redirectUrl ? `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}` : "/sign-up"}
          afterSignInUrl={redirectUrl}
        />
      </div>
    </div>
  );
}
