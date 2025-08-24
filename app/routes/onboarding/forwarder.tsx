import { getServerAuth } from "~/contexts/auth";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "react-router";
import type { Route } from "./+types/forwarder";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useNavigate } from "react-router";
import { useUser } from "@clerk/react-router";
import ForwarderOnboarding from "~/components/forwarder/ForwarderOnboarding";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getServerAuth(args.request);
  
  if (!userId) {
    return redirect("/sign-in");
  }

  try {
    // Check if user already exists in users table
    const existingUser = await fetchQuery(api.users.findUserByToken, { tokenIdentifier: userId });
    
    if (existingUser) {
      // User already exists, redirect to their dashboard
      return redirect(`/${existingUser.role}`);
    }

    // Check if user already exists as a forwarder (legacy check)
    const existingForwarder = await fetchQuery(api.forwarders.getForwarderByUserId, { userId });
    
    if (existingForwarder) {
      // Legacy forwarder exists, redirect to forwarder dashboard
      return redirect("/forwarder");
    }
  } catch (error) {
    console.error("Error checking existing user:", error);
  }

  return { userId };
}

export default function ForwarderOnboardingPage({ loaderData }: Route.ComponentProps) {
  const { user } = useUser();
  const navigate = useNavigate();
  const createUser = useMutation(api.users.createUser);

  const handleComplete = async () => {
    if (!user) return;
    
    try {
      // Create user record with forwarder role
      await createUser({
        name: user.fullName || user.firstName || "User",
        email: user.emailAddresses[0]?.emailAddress || "",
        role: "forwarder",
      });
      
      // Redirect to forwarder dashboard
      navigate("/forwarder");
      
    } catch (error) {
      console.error("Error creating forwarder:", error);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <ForwarderOnboarding
      userId={user.id}
      onComplete={handleComplete}
    />
  );
}