import { Link } from "react-router";
import { Users, Package, ArrowRight } from "lucide-react";

export function meta() {
  return [
    { title: "Login - Opus Logistics" },
    { name: "description", content: "Choose how you want to access Opus - as a customer or forwarder" },
  ];
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Get Started with Opus</h1>
          <p className="text-gray-600">Create your account to continue</p>
        </div>

        {/* Simple Signup Link */}
        <div className="space-y-4">
          <Link
            to="/sign-up"
            className="block w-full p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Create Account</h3>
                  <p className="text-sm text-gray-600">Sign up and choose your account type</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
          </Link>
        </div>

        {/* Sign In Link */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link 
              to="/sign-in" 
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="mt-4 text-center">
          <Link 
            to="/" 
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}