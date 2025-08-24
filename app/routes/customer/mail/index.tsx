import type { Route } from "./+types/index";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { XCircle, Package, Truck, Mail, ShoppingBag, Lightbulb, Settings } from "lucide-react";
import EmailManager from "../../../components/customer/EmailManager";

export function meta() {
  return [
    { title: "Mail - Customer Dashboard" },
    { name: "description", content: "View your shipping confirmations and order emails" },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  // Temporarily bypass auth and Convex
  return { 
    customer: { 
      _id: 'temp-id',
      email: 'benongyr@gmail.com', 
      forwardingAddress: 'test@example.com' 
    } 
  };
}

export default function CustomerMail({ loaderData }: Route.ComponentProps) {
  const { customer } = loaderData;
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [showEmailSettings, setShowEmailSettings] = useState(false);

  // Get customer's emails with fallback
  const allEmails = useQuery(api.emails.getCustomerEmails, { 
    customerId: customer._id,
    limit: 50 
  }) || [];
  
  // Get email statistics with fallback
  const emailStats = useQuery(api.emails.getEmailStats, { customerId: customer._id }) || {
    totalEmails: 0,
    shippingEmails: 0,
    matchedEmails: 0,
    spamEmails: 0
  };

  const selectedEmail = null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getEmailIcon = (email: any) => {
    if (!email.isShippingEmail) return <XCircle className="w-4 h-4 text-red-500" />; // Spam
    if (email.matchedOrderId) return <Package className="w-4 h-4 text-green-500" />; // Matched to order
    if (email.extractedData.trackingNumbers.length > 0) return <Truck className="w-4 h-4 text-blue-500" />; // Has tracking
    return <Mail className="w-4 h-4 text-gray-500" />; // Regular email
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mail</h1>
            <p className="mt-2 text-gray-600">
              Manage email forwarding and view your shipping confirmations
            </p>
          </div>
          <button
            onClick={() => setShowEmailSettings(!showEmailSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            {showEmailSettings ? 'Hide Settings' : 'Email Settings'}
          </button>
        </div>

        {/* Email Settings Section */}
        {showEmailSettings && (
          <div className="space-y-6 mb-8">
            {/* How It Works Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                  <span>How Email Forwarding Works</span>
                </div>
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

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Forwarding Email
                  </label>
                  <input
                    type="email"
                    value={customer.email}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shopping Email Address
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value="your-shopping@opus1.com"
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      Copy
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Use this email address when shopping online
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mailbox Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Mailbox</h2>
            <p className="text-gray-600">Your processed shipping emails and confirmations</p>
          </div>
        </div>

        {/* Email Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-blue-600">{emailStats.totalEmails}</div>
              <div className="text-sm text-gray-600">Total Emails</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-600">{emailStats.shippingEmails}</div>
              <div className="text-sm text-gray-600">Shipping Updates</div>
            </div>
            <div>
              <div className="text-xl font-bold text-orange-600">{emailStats.matchedEmails}</div>
              <div className="text-sm text-gray-600">Matched Orders</div>
            </div>
            <div>
              <div className="text-xl font-bold text-red-600">{emailStats.spamEmails}</div>
              <div className="text-sm text-gray-600">Filtered Spam</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Inbox</h2>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-4">📭</div>
                  <p>No emails yet</p>
                  <p className="text-sm mt-2">
                    Shipping confirmations will appear here when you shop online
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-center h-96 text-gray-500">
                <div className="text-center">
                  <Mail className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p>Select an email to read</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}