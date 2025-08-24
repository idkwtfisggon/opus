import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "~/contexts/auth";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import type { Route } from "./+types/sign-in";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sign In - Opus1" },
    { name: "description", content: "Sign in to your Opus1 account" },
  ];
}

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role");
  const redirectUrl = searchParams.get('redirect_url');

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🚀 FORM SUBMIT STARTED');
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log('About to call signIn with:', email, password.length + ' chars');
      const { data, error } = await signIn(email, password);
      
      console.log('Sign in result:', { data, error });
      console.log('Full data object:', JSON.stringify(data, null, 2));
      
      if (error) {
        console.log('Sign in error:', error);
        setError(error.message);
        setLoading(false);
        return;
      }

      console.log('🔥 CHECKING IF DATA.USER EXISTS:', !!data?.user);
      if (data?.user) {
        console.log('🔥 INSIDE DATA.USER BLOCK');
        const userRole = data.user.role || data.user.user_metadata?.role || 'customer';
        console.log('User role detected:', userRole);
        console.log('User data:', JSON.stringify(data.user, null, 2));
        console.log('Redirect URL from params:', redirectUrl);
        
        console.log('🔥 ABOUT TO EXECUTE REDIRECT');
        // IMMEDIATE REDIRECT - HARD NAVIGATION
        console.log('FORCING IMMEDIATE REDIRECT');
        if (userRole === 'customer') {
          window.location.href = '/customer';
        } else if (userRole === 'staff') {
          window.location.href = '/staff';
        } else if (userRole === 'forwarder') {
          window.location.href = '/forwarder';
        } else {
          window.location.href = '/onboarding';
        }
        console.log('🔥 REDIRECT EXECUTED');
        setLoading(false);
        
      } else {
        console.log('No user data in response:', data);
        console.log('Data type:', typeof data);
        console.log('Data keys:', data ? Object.keys(data) : 'data is null/undefined');
        setLoading(false);
      }
    } catch (err) {
      console.log('Caught error:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
          {role && (
            <div className="text-center mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">
                Signing in as: <span className="font-semibold capitalize">{role}</span>
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading} onClick={() => console.log('🔴 BUTTON CLICKED')}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <a href={redirectUrl ? `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}` : "/sign-up"} className="text-blue-600 hover:underline">
              Sign up
            </a>
          </div>

          {/* Temporary password notice for migrated users */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <p className="text-yellow-800">
              <strong>Migrated from Clerk?</strong> Use password: <code>temp_password_123</code> 
              then change it in your account settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
