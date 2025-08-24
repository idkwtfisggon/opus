import { getServerAuth } from "~/contexts/auth";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "react-router";
import type { Route } from "./+types/onboarding";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSearchParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/react-router";
import { CheckCircle, Users, Package } from "lucide-react";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getServerAuth(args.request);
  
  if (!userId) {
    return redirect("/sign-in");
  }

  // TEMPORARILY DISABLE USER CHECKS TO STOP REDIRECT LOOP
  console.log("Main onboarding loader: DISABLED USER CHECKS");

  return { userId };
}

export default function OnboardingPage() {
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get("role");
  
  // Check if user is already a staff member or forwarder
  const staff = useQuery(
    api.staff.getStaffByUserId, 
    user?.id ? { userId: user.id } : "skip"
  );
  
  const forwarder = useQuery(
    api.forwarders.getForwarderByUserId,
    user?.id ? { userId: user.id } : "skip"
  );
  
  // Redirect existing users to their dashboards
  useEffect(() => {
    if (user?.id) {
      if (staff) {
        window.location.href = "/staff";
        return;
      }
      if (forwarder) {
        window.location.href = "/forwarder";
        return;
      }
    }
  }, [user, staff, forwarder]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const createUser = useMutation(api.users.createUser);

  const fixUserRole = useMutation(api.users.fixUserRole);

  const handleRoleSetup = async (selectedRole: "customer" | "forwarder") => {
    if (!user) return;
    
    // Always redirect to role-specific onboarding for new users
    navigate(`/onboarding/${selectedRole}`);
  };

  useEffect(() => {
    // If role is specified in URL, redirect to specific onboarding
    if (role && (role === "customer" || role === "forwarder")) {
      navigate(`/onboarding/${role}`);
    }
  }, [role]);

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Opus!</h1>
          <p className="text-gray-600 mb-4">
            Your account has been set up as a <span className="font-semibold capitalize">{role}</span>
          </p>
          <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  if (role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Setting up your account...</h1>
          <p className="text-gray-600">
            Creating your <span className="font-semibold capitalize">{role}</span> profile
          </p>
        </div>
      </div>
    );
  }

  // Manual role selection (fallback)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Role</h1>
          <p className="text-gray-600">How will you be using Opus?</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleRoleSetup("customer")}
            disabled={isLoading}
            className="w-full p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900">Customer</h3>
                <p className="text-sm text-gray-600">Track orders and manage shipments</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleRoleSetup("forwarder")}
            disabled={isLoading}
            className="w-full p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900">Forwarder</h3>
                <p className="text-sm text-gray-600">Manage operations and customer orders</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}