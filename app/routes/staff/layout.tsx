import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { Outlet } from "react-router";
import { redirect } from "react-router";
import { useAuth } from "@clerk/react-router";

export async function loader(args: any) {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    return redirect("/sign-in");
  }

  try {
    // Get staff profile
    const staff = await fetchQuery(api.staff.getStaffByUserId, { userId });
    
    if (!staff) {
      // Check if they might be a forwarder instead
      const forwarder = await fetchQuery(api.forwarders.getForwarderByUserId, { userId }).catch(() => null);
      if (forwarder) {
        return redirect("/forwarder");
      }
      // If neither staff nor forwarder, redirect to staff signup
      return redirect("/staff-signup");
    }

    if (!staff.isActive) {
      throw new Response("Staff account is inactive", { status: 403 });
    }

    return { staff };
    
  } catch (error) {
    console.error("Error loading staff data:", error);
    // Check if they might be a forwarder before giving up
    const forwarder = await fetchQuery(api.forwarders.getForwarderByUserId, { userId }).catch(() => null);
    if (forwarder) {
      return redirect("/forwarder");
    }
    return redirect("/sign-in");
  }
}

export default function StaffLayout() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/staff-signup";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-first layout */}
      <div className="pb-16"> {/* Space for bottom nav */}
        <Outlet />
      </div>
      
      {/* Bottom Navigation (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <nav className="flex justify-around py-2">
          <a href="/staff" 
             className="flex flex-col items-center py-2 px-3 text-primary">
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7zm0 0a2 2 0 012-2h14a2 2 0 012 2v2H3V7z" />
            </svg>
            <span className="text-xs">Dashboard</span>
          </a>
          
          <a href="/staff/scanner" 
             className="flex flex-col items-center py-2 px-3 text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-.01M12 12v-.01M12 12h-4.01M12 12v4.01" />
            </svg>
            <span className="text-xs">Scanner</span>
          </a>
          
          <a href="/staff/orders" 
             className="flex flex-col items-center py-2 px-3 text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <span className="text-xs">Orders</span>
          </a>
          
          <a href="/staff/activity" 
             className="flex flex-col items-center py-2 px-3 text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs">Activity</span>
          </a>
          
          <a href="/staff/profile" 
             className="flex flex-col items-center py-2 px-3 text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs">Profile</span>
          </a>

          <button 
            onClick={handleSignOut}
            className="flex flex-col items-center py-2 px-3 text-red-600 hover:text-red-700 transition-colors">
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs">Sign Out</span>
          </button>
        </nav>
      </div>
    </div>
  );
}