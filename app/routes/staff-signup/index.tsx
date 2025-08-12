import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth, useSession } from "@clerk/react-router";

export default function StaffSignup() {
  const { isSignedIn, user, signOut } = useAuth();
  const { session } = useSession();
  
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Get current URL for redirect
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:5173/staff-signup';

  const joinAsStaff = useMutation(api.staff.joinWithInviteCode);
  
  // Check if user is already a staff member
  const existingStaff = useQuery(
    api.staff.getStaffByUserId, 
    isSignedIn && (user?.id || session?.user?.id) ? { userId: user?.id || session?.user?.id } : "skip"
  );
  
  // Check if user is a forwarder
  const existingForwarder = useQuery(
    api.forwarders.getForwarderByUserId,
    isSignedIn && (user?.id || session?.user?.id) ? { userId: user?.id || session?.user?.id } : "skip"
  );
  

  // Redirect if already staff or forwarder
  useEffect(() => {
    if (isSignedIn && (user?.id || session?.user?.id)) {
      if (existingStaff) {
        window.location.href = "/staff";
        return;
      }
      if (existingForwarder) {
        window.location.href = "/forwarder";
        return;
      }
    }
  }, [isSignedIn, user, session, existingStaff, existingForwarder]);

  const handleJoinStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      setError("Please sign in first");
      return;
    }
    
    const userId = session?.user?.id || user?.id;
    if (!userId) {
      setError("User data still loading, please try again");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userEmail = session?.user?.primaryEmailAddress?.emailAddress || user?.primaryEmailAddress?.emailAddress;
      if (!userEmail) {
        setError("Unable to get your email address. Please try signing in again.");
        return;
      }

      await joinAsStaff({
        inviteCode,
        userId: userId,
        email: userEmail,
      });

      // Redirect to staff dashboard
      window.location.href = "/staff";
    } catch (err: any) {
      setError(err.message || "Failed to join staff");
    } finally {
      setLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Join Warehouse Team</h1>
            <p className="text-muted-foreground mt-2">
              Create your account to get started
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="text-center text-sm text-muted-foreground mb-4">
              First time here? Create your account to join the team.
            </div>
            
            <div className="space-y-3">
              <a 
                href={`/sign-up?redirect_url=${encodeURIComponent(currentUrl)}`}
                className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium text-center block"
              >
                🆕 Create Account
              </a>
              
              <div className="text-center text-xs text-muted-foreground">
                or
              </div>
              
              <button
                onClick={() => {
                  window.location.href = '/sign-in?redirect_url=' + encodeURIComponent('/staff-signup');
                }}
                className="w-full border border-border text-foreground py-3 px-4 rounded-lg hover:bg-accent transition-colors font-medium text-center block"
              >
                🔑 Already have an account? Sign In
              </button>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            💡 After creating your account, you'll return here to enter your invite code
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Join Warehouse Team</h1>
          <p className="text-muted-foreground mt-2">
            Enter the invite code provided by your forwarder admin
          </p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-6">
          <form onSubmit={handleJoinStaff} className="space-y-4">
            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-foreground mb-2">
                Invite Code
              </label>
              <input
                type="text"
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code (e.g., WH-ABC123)"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !inviteCode}
              className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Joining..." : "Join Team"}
            </button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an invite code?{" "}
            <span className="text-foreground">Contact your warehouse manager</span>
          </p>
        </div>

        <div className="bg-muted border border-border rounded-xl p-4">
          <h3 className="font-medium text-foreground mb-2">Staff Access Includes:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 📱 Mobile barcode scanning</li>
            <li>• 📦 Order status updates</li>
            <li>• 📊 Performance tracking</li>
            <li>• 🏢 Warehouse assignments</li>
          </ul>
        </div>
      </div>
    </div>
  );
}