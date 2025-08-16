import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface EmailManagerProps {
  customerId: string;
}

export default function EmailManager({ customerId }: EmailManagerProps) {
  const [realEmail, setRealEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Get customer's email address
  const customerEmail = useQuery(api.emails.getCustomerEmail, { customerId });
  
  // Get email statistics
  const emailStats = useQuery(api.emails.getEmailStats, { customerId });
  
  // Get recent shipping emails
  const shippingEmails = useQuery(api.emails.getShippingEmails, { 
    customerId, 
    limit: 10 
  });

  // Generate email address
  const generateEmail = useMutation(api.emails.generateCustomerEmail);

  const handleGenerateEmail = async () => {
    if (!realEmail.trim()) {
      alert("Please enter your real email address");
      return;
    }

    try {
      await generateEmail({
        customerId,
        realEmail: realEmail.trim(),
      });
      setShowEmailForm(false);
      setRealEmail("");
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
            
            <div className="text-sm text-gray-600">
              <p>• Use this email address when shopping online</p>
              <p>• Shipping confirmations will be automatically forwarded to: <strong>{customerEmail.realEmail}</strong></p>
              <p>• Our system will track and match your packages automatically</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Generate a unique email address for your online shopping. All shipping confirmations 
              will be automatically processed and forwarded to your real email.
            </p>
            
            {!showEmailForm ? (
              <button
                onClick={() => setShowEmailForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Generate Shopping Email
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Real Email Address
                  </label>
                  <input
                    type="email"
                    value={realEmail}
                    onChange={(e) => setRealEmail(e.target.value)}
                    placeholder="your.email@gmail.com"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Shipping confirmations will be forwarded here
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateEmail}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Generate Email
                  </button>
                  <button
                    onClick={() => setShowEmailForm(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
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