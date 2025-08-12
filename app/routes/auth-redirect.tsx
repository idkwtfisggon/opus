import { useEffect } from "react";
import { useAuth } from "@clerk/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function AuthRedirect() {
  const { isSignedIn, user } = useAuth();
  
  // If not signed in, redirect to sign-in page
  useEffect(() => {
    if (!isSignedIn) {
      window.location.href = "/sign-in";
      return;
    }
  }, [isSignedIn]);
  
  // Check what type of user this is
  const staff = useQuery(
    api.staff.getStaffByUserId, 
    isSignedIn && user?.id ? { userId: user.id } : "skip"
  );
  
  const forwarder = useQuery(
    api.forwarders.getForwarderByUserId,
    isSignedIn && user?.id ? { userId: user.id } : "skip"
  );
  
  const customer = useQuery(
    api.customers.getCustomerByUserId,
    isSignedIn && user?.id ? { userId: user.id } : "skip"
  );

  useEffect(() => {
    if (isSignedIn && user?.id) {
      // Redirect based on user type
      if (staff) {
        window.location.href = "/staff";
        return;
      }
      if (forwarder) {
        window.location.href = "/forwarder";
        return;
      }
      if (customer) {
        window.location.href = "/customer";
        return;
      }
      
      // If no specific user type found, go to onboarding
      window.location.href = "/onboarding";
    }
  }, [isSignedIn, user, staff, forwarder, customer]);

  // Show loading while we figure out where to redirect
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}