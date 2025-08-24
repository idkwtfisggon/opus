import { fetchQuery } from "convex/nextjs";
import type { Route } from "./+types/layout";
import { api } from "../../../convex/_generated/api";
import { Outlet } from "react-router";
import { redirect } from "react-router";
import { getServerAuth, useAuth } from "~/contexts/auth";

export async function loader(args: Route.LoaderArgs) {
  console.log("Customer layout: Checking auth...");
  const { userId, user } = await getServerAuth(args.request);
  
  console.log("Customer layout: Got userId:", userId, "user:", user);
  
  if (!userId || !user) {
    console.log("Customer layout: No auth, redirecting to sign-in");
    return redirect("/sign-in");
  }

  // Check user role
  const userRole = user.user_metadata?.role || 'customer';
  if (userRole !== "customer") {
    console.log(`Customer layout: Wrong role ${userRole}, redirecting to /${userRole}`);
    return redirect(`/${userRole}`);
  }

  // Try to get Convex user, but don't fail if it doesn't exist
  try {
    const convexUser = await fetchQuery(api.users.findUserByToken, { tokenIdentifier: userId });
    console.log("Customer layout: Convex user found:", !!convexUser);
    
    if (convexUser) {
      if (convexUser.role !== "customer") {
        console.log(`Customer layout: Wrong convex role ${convexUser.role}, redirecting to /${convexUser.role}`);
        return redirect(`/${convexUser.role}`);
      }
      return { user: convexUser };
    } else {
      // Create temporary user data if Convex user doesn't exist
      console.log("Customer layout: No Convex user, using temp data");
      return { 
        user: { 
          _id: userId,
          role: 'customer', 
          email: user.email, 
          name: user.user_metadata?.username || user.email?.split('@')[0] || 'Customer',
          firstName: user.user_metadata?.first_name,
          lastName: user.user_metadata?.last_name
        } 
      };
    }
  } catch (error) {
    console.error("Customer layout: Convex error:", error);
    // Fallback to temp user data
    return { 
      user: { 
        _id: userId,
        role: 'customer', 
        email: user.email, 
        name: user.user_metadata?.username || user.email?.split('@')[0] || 'Customer',
        firstName: user.user_metadata?.first_name,
        lastName: user.user_metadata?.last_name
      } 
    };
  }
}

export default function CustomerLayout() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Redirect will happen automatically
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <h2 className="text-xl font-semibold text-sidebar-foreground tracking-tight">
            Logistics Hub
          </h2>
          <p className="text-sm text-sidebar-foreground/60 mt-1">Customer Portal</p>
        </div>
        
        <nav className="p-4 space-y-2">
          <a href="/customer" 
             className="flex items-center px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7zm0 0a2 2 0 012-2h14a2 2 0 012 2v2H3V7z" />
            </svg>
            Dashboard
          </a>
          
          <a href="/customer/mail" 
             className="flex items-center px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Mail
          </a>
          
          <a href="/customer/orders" 
             className="flex items-center px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            My Orders
          </a>
          
          <a href="/customer/settings" 
             className="flex items-center px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Shipping Settings
          </a>
        </nav>
        
        {/* Account Settings and Help/Logout at bottom */}
        <div className="mt-auto p-4 border-t border-sidebar-border space-y-2">
          <a href="/customer/account" 
             className="flex items-center px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Account Settings
          </a>
          
          
          <button className="flex items-center w-full px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Help & Support
          </button>
          
          <button 
            onClick={handleSignOut}
            className="flex items-center w-full px-3 py-2 text-sidebar-foreground hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors group">
            <svg className="w-5 h-5 mr-3 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}