import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface EmailManagerProps {
  customerId: string;
}

export default function EmailManager({ customerId }: EmailManagerProps) {
  const [newForwardingEmail, setNewForwardingEmail] = useState("");
  const [showChangeEmailForm, setShowChangeEmailForm] = useState(false);

  // Get customer's email address
  const customerEmail = useQuery(api.emails.getCustomerEmail, { customerId });
  
  // Get email statistics
  const emailStats = useQuery(api.emails.getEmailStats, { customerId });
  
  // Get recent shipping emails
  const shippingEmails = useQuery(api.emails.getShippingEmails, { 
    customerId, 
    limit: 10 
  });

  // Auto-generate email if it doesn't exist
  const autoGenerateEmail = useMutation(api.emails.autoGenerateCustomerEmail);
  
  // Update forwarding email
  const updateForwardingEmail = useMutation(api.emails.updateForwardingEmail);

  // Email should be auto-generated at account creation
  // If somehow missing, show a generate button as fallback

  const handleGenerateEmail = async () => {
    try {
      await autoGenerateEmail({ customerId });
    } catch (error: any) {
      console.error("Error generating email:", error);
    }
  };

  const handleUpdateForwardingEmail = async () => {
    if (!newForwardingEmail.trim()) {
      alert("Please enter a valid email address");
      return;
    }

    try {
      await updateForwardingEmail({
        customerId,
        newRealEmail: newForwardingEmail.trim(),
      });
      setShowChangeEmailForm(false);
      setNewForwardingEmail("");
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Address Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Your Shopping Email Address
        </h3>
        
        {customerEmail ? (
          <div className="space-y-4">
            {/* Shopping Email Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Use this email at checkout:</p>
                  <p className="text-lg font-mono font-semibold text-blue-800 break-all">
                    {customerEmail.emailAddress}
                  </p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(customerEmail.emailAddress)}
                  className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>
            
            {/* Forwarding Email Settings */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Emails forwarded to:</p>
                  <p className="text-sm text-gray-900">{customerEmail.realEmail}</p>
                </div>
                <button
                  onClick={() => setShowChangeEmailForm(true)}
                  className="text-blue-600 text-sm hover:text-blue-800"
                >
                  Change
                </button>
              </div>
              
              {showChangeEmailForm && (
                <div className="space-y-3 mt-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Forwarding Email
                    </label>
                    <input
                      type="email"
                      value={newForwardingEmail}
                      onChange={(e) => setNewForwardingEmail(e.target.value)}
                      placeholder="your.new.email@gmail.com"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateForwardingEmail}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                    >
                      Update
                    </button>
                    <button
                      onClick={() => {
                        setShowChangeEmailForm(false);
                        setNewForwardingEmail("");
                      }}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-sm text-gray-600">
              <p>• Use your shopping email address when shopping online</p>
              <p>• Shipping confirmations will be automatically processed and forwarded</p>
              <p>• Our system will track and match your packages automatically</p>
            </div>
          </div>
        ) : customerEmail === undefined ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Generating your shopping email address...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Your shopping email address will be automatically generated using your name. 
              All shipping confirmations will be forwarded to your signup email.
            </p>
            
            <button
              onClick={handleGenerateEmail}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Generate Shopping Email
            </button>
          </div>
        )}
      </div>

      {/* Email Statistics */}
      {emailStats && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Email Activity
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{emailStats.totalEmails}</div>
              <div className="text-sm text-gray-600">Total Emails</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{emailStats.shippingEmails}</div>
              <div className="text-sm text-gray-600">Shipping Confirmations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{emailStats.matchedEmails}</div>
              <div className="text-sm text-gray-600">Matched Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{emailStats.spamEmails}</div>
              <div className="text-sm text-gray-600">Spam Blocked</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Shipping Emails */}
      {shippingEmails && shippingEmails.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Shipping Confirmations
          </h3>
          
          <div className="space-y-4">
            {shippingEmails.map((email) => (
              <div key={email._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        From: {email.from}
                      </span>
                      {email.extractedData.shopName && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {email.extractedData.shopName}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">{email.subject}</p>
                    
                    {email.extractedData.trackingNumbers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {email.extractedData.trackingNumbers.map((tracking, idx) => (
                          <span 
                            key={idx}
                            className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-mono"
                          >
                            {tracking}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Confidence: {Math.round(email.confidence * 100)}%</span>
                      <span>Received: {new Date(email.receivedAt).toLocaleDateString()}</span>
                      {email.isForwarded && (
                        <span className="text-green-600">✓ Forwarded</span>
                      )}
                      {email.matchedOrderId && (
                        <span className="text-blue-600">✓ Matched to Order</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {email.attachments.length > 0 && (
                      <span className="text-xs text-gray-500">
                        📎 {email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}