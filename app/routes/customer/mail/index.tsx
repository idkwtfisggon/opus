import type { Route } from "./+types/index";
import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { XCircle, Package, Truck, Mail } from "lucide-react";

export function meta() {
  return [
    { title: "Mail - Customer Dashboard" },
    { name: "description", content: "View your shipping confirmations and order emails" },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  try {
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

export default function CustomerMail({ loaderData }: Route.ComponentProps) {
  const { customer } = loaderData;
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Get customer's emails
  const allEmails = useQuery(api.emails.getCustomerEmails, { 
    customerId: customer._id,
    limit: 50 
  });
  
  // Get email statistics
  const emailStats = useQuery(api.emails.getEmailStats, { customerId: customer._id });

  const selectedEmail = allEmails?.find(email => email._id === selectedEmailId);

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mail</h1>
          <p className="mt-2 text-gray-600">
            Your shipping confirmations and order updates
          </p>
        </div>

        {/* Email Stats */}
        {emailStats && (
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
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Inbox</h2>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {allEmails && allEmails.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {allEmails.map((email) => (
                      <div
                        key={email._id}
                        onClick={() => setSelectedEmailId(email._id)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedEmailId === email._id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg flex-shrink-0 mt-1">
                            {getEmailIcon(email)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {email.from.split('@')[0]}
                              </p>
                              <span className="text-xs text-gray-500">
                                {new Date(email.receivedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                              {email.subject}
                            </p>
                            
                            {/* Show tracking numbers if available */}
                            {email.extractedData.trackingNumbers.length > 0 && (
                              <div className="mt-1">
                                <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                  {email.extractedData.trackingNumbers[0]}
                                  {email.extractedData.trackingNumbers.length > 1 && ' +more'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-4xl mb-4">📭</div>
                    <p>No emails yet</p>
                    <p className="text-sm mt-2">
                      Shipping confirmations will appear here when you shop online
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200">
              {selectedEmail ? (
                <div>
                  {/* Email Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                          {selectedEmail.subject}
                        </h2>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span><strong>From:</strong> {selectedEmail.from}</span>
                          <span><strong>Received:</strong> {formatDate(selectedEmail.receivedAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedEmail.isForwarded && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            ✓ Forwarded
                          </span>
                        )}
                        {selectedEmail.matchedOrderId && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            ✓ Order Matched
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Extracted Data */}
                    {selectedEmail.extractedData && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                        {selectedEmail.extractedData.trackingNumbers.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Tracking Numbers:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedEmail.extractedData.trackingNumbers.map((tracking, idx) => (
                                <span 
                                  key={idx}
                                  className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-mono"
                                >
                                  {tracking}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedEmail.extractedData.shopName && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Shop:</span>
                            <div className="text-sm text-gray-900 mt-1">
                              {selectedEmail.extractedData.shopName}
                            </div>
                          </div>
                        )}
                        
                        {selectedEmail.extractedData.estimatedValue && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Value:</span>
                            <div className="text-sm text-gray-900 mt-1">
                              {selectedEmail.extractedData.currency || '$'}{selectedEmail.extractedData.estimatedValue}
                            </div>
                          </div>
                        )}
                        
                        {selectedEmail.extractedData.weight && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Weight:</span>
                            <div className="text-sm text-gray-900 mt-1">
                              {selectedEmail.extractedData.weight}kg
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Email Body */}
                  <div className="p-6">
                    <div 
                      className="prose max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                    />
                  </div>

                  {/* Attachments */}
                  {selectedEmail.attachments.length > 0 && (
                    <div className="p-6 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Attachments</h3>
                      <div className="space-y-2">
                        {selectedEmail.attachments.map((attachment, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <span className="text-sm">📎</span>
                            <span className="text-sm text-gray-900">{attachment.filename}</span>
                            <span className="text-xs text-gray-500">
                              ({Math.round(attachment.size / 1024)}KB)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500">
                  <div className="text-center">
                    <Mail className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p>Select an email to read</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}