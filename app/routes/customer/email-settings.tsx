import type { Route } from "./+types/email-settings";
import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import EmailManager from "../../components/customer/EmailManager";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Email Settings - Customer Dashboard" },
    { name: "description", content: "Manage your shopping email addresses and shipping notifications" },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get customer profile
    const customer = await fetchQuery(api.customerDashboard.getCustomerProfile, { userId });
    
    if (!customer) {
      throw new Response("Customer profile not found", { status: 404 });
    }

    return { 
      customer,
      userId
    };
  } catch (error) {
    console.error("Error loading customer data:", error);
    throw new Response("Internal Server Error", { status: 500 });
  }
}

export default function CustomerEmailSettings({ loaderData }: Route.ComponentProps) {
  const { customer } = loaderData;

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your shopping email addresses and shipping notifications
          </p>
        </div>

        {/* How It Works Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">
            🛍️ How Email Forwarding Works
          </h2>
          <div className="space-y-3 text-blue-800">
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</span>
              <p>Generate a unique email address for online shopping</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</span>
              <p>Use this email when shopping on any website (Amazon, AliExpress, etc.)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</span>
              <p>Shipping confirmations are automatically processed and forwarded to your real email</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">4</span>
              <p>Our system extracts tracking numbers and matches them to your orders</p>
            </div>
          </div>
        </div>

        {/* Email Manager Component */}
        <EmailManager customerId={customer._id} />

        {/* Browser Extension Tip */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            💡 Pro Tip: Browser Extension
          </h3>
          <p className="text-green-800 mb-4">
            Install our browser extension to automatically fill your shopping email address at checkout. 
            No more copying and pasting!
          </p>
          <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
            Install Browser Extension
          </button>
        </div>

        {/* Support Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            📧 Email Troubleshooting
          </h3>
          <div className="space-y-2 text-gray-700">
            <p><strong>Not receiving forwards?</strong> Check your spam folder and add our domain to your whitelist.</p>
            <p><strong>Missing tracking info?</strong> Some shops send tracking in separate emails - these will be processed too.</p>
            <p><strong>Wrong email detected?</strong> Our AI learns from patterns - report any mistakes to improve accuracy.</p>
          </div>
          <div className="mt-4">
            <a href="/support" className="text-blue-600 hover:text-blue-800 underline">
              Contact Support →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}