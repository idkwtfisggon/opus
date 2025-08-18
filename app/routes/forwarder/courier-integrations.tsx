import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { Package, Plane, Truck, Settings, HelpCircle, Rocket } from "lucide-react";

export async function loader(args: any) {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get forwarder profile
    const forwarder = await fetchQuery(api.forwarders.getForwarderByUserId, { userId });
    
    if (!forwarder) {
      throw new Response("Forwarder profile not found", { status: 404 });
    }

    return { 
      forwarder,
      userId
    };
  } catch (error) {
    console.error("Error loading forwarder data:", error);
    throw new Response("Internal Server Error", { status: 500 });
  }
}

const SUPPORTED_COURIERS = [
  {
    name: "DHL",
    logo: <Truck className="w-6 h-6" />,
    description: "Global express delivery and logistics",
    apiDocUrl: "https://developer.dhl.com/",
    fields: [
      { key: "accountNumber", label: "Account Number", type: "text", required: true },
      { key: "apiKey", label: "API Key", type: "password", required: true },
      { key: "apiSecret", label: "API Secret", type: "password", required: true },
      { key: "siteId", label: "Site ID", type: "text", required: false },
    ]
  },
  {
    name: "UPS",
    logo: <Package className="w-6 h-6" />,
    description: "Worldwide package delivery and supply chain",
    apiDocUrl: "https://developer.ups.com/",
    fields: [
      { key: "accountNumber", label: "Account Number", type: "text", required: true },
      { key: "apiKey", label: "API Key", type: "password", required: true },
      { key: "password", label: "Password", type: "password", required: true },
    ]
  },
  {
    name: "FedEx",
    logo: <Plane className="w-6 h-6" />,
    description: "Express transportation and business services",
    apiDocUrl: "https://developer.fedex.com/",
    fields: [
      { key: "accountNumber", label: "Account Number", type: "text", required: true },
      { key: "apiKey", label: "API Key", type: "password", required: true },
      { key: "apiSecret", label: "API Secret", type: "password", required: true },
      { key: "meterNumber", label: "Meter Number", type: "text", required: true },
    ]
  },
  {
    name: "SF Express",
    logo: <Truck className="w-6 h-6" />,
    description: "Leading logistics service provider in Asia",
    apiDocUrl: "https://open.sf-express.com/",
    fields: [
      { key: "accountNumber", label: "Customer Code", type: "text", required: true },
      { key: "apiKey", label: "Access Code", type: "password", required: true },
      { key: "apiSecret", label: "Secret Key", type: "password", required: true },
    ]
  }
];

export default function CourierIntegrations({ loaderData }: any) {
  const { forwarder } = loaderData;
  
  // Get existing integrations
  const integrations = useQuery(api.courierIntegrations.getForwarderCourierIntegrations, {
    forwarderId: forwarder._id
  });

  // Mutations
  const upsertIntegration = useMutation(api.courierIntegrations.upsertCourierIntegration);
  const testApi = useMutation(api.courierIntegrations.testCourierApi);

  // State
  const [selectedCourier, setSelectedCourier] = useState<string | null>(null);
  const [mode, setMode] = useState<"api" | "manual">("api");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [settings, setSettings] = useState({
    defaultService: "",
    enableEtd: false,
    autoTracking: true,
    trackingFrequency: 4
  });
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const getIntegrationStatus = (courierName: string) => {
    const integration = integrations?.find(i => i.courierName === courierName);
    return integration?.status || "not_configured";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready": return "bg-green-100 text-green-800";
      case "testing": return "bg-yellow-100 text-yellow-800";
      case "error": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready": return "✅";
      case "testing": return "⏳";
      case "error": return "❌";
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const handleSaveIntegration = async () => {
    if (!selectedCourier) return;
    
    setIsLoading(selectedCourier);
    try {
      const integrationId = await upsertIntegration({
        forwarderId: forwarder._id,
        courierName: selectedCourier,
        mode,
        apiCredentials: mode === "api" ? {
          ...credentials,
          environment
        } : undefined,
        settings
      });

      // If API mode, run test automatically
      if (mode === "api") {
        await testApi({ integrationId });
      }

      setSelectedCourier(null);
      setCredentials({});
    } catch (error) {
      console.error("Error saving integration:", error);
      alert("Failed to save integration");
    } finally {
      setIsLoading(null);
    }
  };

  const handleTestIntegration = async (courierName: string) => {
    const integration = integrations?.find(i => i.courierName === courierName);
    if (!integration) return;

    setIsLoading(courierName);
    try {
      await testApi({ integrationId: integration._id });
    } catch (error) {
      console.error("Error testing integration:", error);
      alert("Failed to test integration");
    } finally {
      setIsLoading(null);
    }
  };

  const openSetupModal = (courierName: string) => {
    const integration = integrations?.find(i => i.courierName === courierName);
    setSelectedCourier(courierName);
    setMode(integration?.mode || "api");
    setCredentials({});
    
    if (integration?.settings) {
      setSettings({
        defaultService: integration.settings.defaultService || "",
        enableEtd: integration.settings.enableEtd || false,
        autoTracking: integration.settings.autoTracking ?? true,
        trackingFrequency: integration.settings.trackingFrequency || 4
      });
    }
  };

  if (!integrations) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-foreground">Courier Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect with shipping carriers to automate label creation and tracking
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {SUPPORTED_COURIERS.map((courier) => {
            const status = getIntegrationStatus(courier.name);
            const integration = integrations.find(i => i.courierName === courier.name);
            
            return (
              <div key={courier.name} className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{courier.logo}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{courier.name}</h3>
                      <p className="text-sm text-muted-foreground">{courier.description}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                    {getStatusIcon(status)} {status.replace('_', ' ')}
                  </span>
                </div>

                {/* Status Details */}
                {integration?.lastTestResult && (
                  <div className="mb-4 p-3 bg-background rounded-lg border">
                    <div className="text-xs text-muted-foreground">
                      Last tested: {new Date(integration.lastTestResult.timestamp).toLocaleString()}
                    </div>
                    {integration.lastTestResult.error && (
                      <div className="text-xs text-red-600 mt-1">
                        Error: {integration.lastTestResult.error}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded ${integration.lastTestResult.rateTest ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        Rate Test: {integration.lastTestResult.rateTest ? '✅' : '❌'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${integration.lastTestResult.labelTest ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        Label Test: {integration.lastTestResult.labelTest ? '✅' : '❌'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Integration Info */}
                {integration && (
                  <div className="mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mode:</span>
                      <span className="text-foreground capitalize">{integration.mode}</span>
                    </div>
                    {integration.mode === "api" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Environment:</span>
                          <span className="text-foreground capitalize">{integration.apiCredentials.environment}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Credentials:</span>
                          <span className="text-foreground">
                            {integration.apiCredentials.hasCredentials ? "Configured" : "Missing"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openSetupModal(courier.name)}
                    className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {integration ? "Configure" : "Setup"}
                  </button>
                  {integration?.mode === "api" && (
                    <button
                      onClick={() => handleTestIntegration(courier.name)}
                      disabled={isLoading === courier.name}
                      className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      {isLoading === courier.name ? "Testing..." : "Test"}
                    </button>
                  )}
                  <a
                    href={courier.apiDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
                  >
                    📚 Docs
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Setup Modal */}
        {selectedCourier && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                  Setup {selectedCourier} Integration
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure your {selectedCourier} account for automated shipping
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">Integration Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMode("api")}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        mode === "api" 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border hover:border-accent"
                      }`}
                    >
                      <div className="font-medium">API Mode</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Fully automated label creation and tracking
                      </div>
                    </button>
                    <button
                      onClick={() => setMode("manual")}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        mode === "manual" 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border hover:border-accent"
                      }`}
                    >
                      <div className="font-medium">Manual Mode</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Manual tracking number entry
                      </div>
                    </button>
                  </div>
                </div>

                {/* API Credentials */}
                {mode === "api" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Environment</label>
                      <select
                        value={environment}
                        onChange={(e) => setEnvironment(e.target.value as "sandbox" | "production")}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="sandbox">Sandbox (Testing)</option>
                        <option value="production">Production (Live)</option>
                      </select>
                    </div>

                    {SUPPORTED_COURIERS.find(c => c.name === selectedCourier)?.fields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type={field.type}
                          value={credentials[field.key] || ""}
                          onChange={(e) => setCredentials(prev => ({
                            ...prev,
                            [field.key]: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder={`Enter your ${field.label.toLowerCase()}`}
                        />
                      </div>
                    ))}
                  </>
                )}

                {/* Settings */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-foreground mb-2">Default Service</label>
                      <input
                        type="text"
                        value={settings.defaultService}
                        onChange={(e) => setSettings(prev => ({ ...prev, defaultService: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="e.g., Express Worldwide"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="enableEtd"
                        checked={settings.enableEtd}
                        onChange={(e) => setSettings(prev => ({ ...prev, enableEtd: e.target.checked }))}
                        className="w-4 h-4 text-primary"
                      />
                      <label htmlFor="enableEtd" className="text-sm text-foreground">
                        Enable Electronic Trade Documents (ETD)
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="autoTracking"
                        checked={settings.autoTracking}
                        onChange={(e) => setSettings(prev => ({ ...prev, autoTracking: e.target.checked }))}
                        className="w-4 h-4 text-primary"
                      />
                      <label htmlFor="autoTracking" className="text-sm text-foreground">
                        Auto-poll for tracking updates
                      </label>
                    </div>

                    {settings.autoTracking && (
                      <div>
                        <label className="block text-sm text-foreground mb-2">
                          Tracking Check Frequency (hours)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={settings.trackingFrequency}
                          onChange={(e) => setSettings(prev => ({ 
                            ...prev, 
                            trackingFrequency: parseInt(e.target.value) || 4 
                          }))}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border flex justify-end gap-3">
                <button
                  onClick={() => setSelectedCourier(null)}
                  className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveIntegration}
                  disabled={isLoading === selectedCourier}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isLoading === selectedCourier ? "Saving..." : "Save & Test"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Getting Started</h3>
          </div>
          <div className="space-y-3 text-sm text-blue-700">
            <div>
              <strong>API Mode:</strong> Connect your carrier account for full automation - rates, labels, and tracking updates.
            </div>
            <div>
              <strong>Manual Mode:</strong> Use when API access isn't available - you'll enter tracking numbers manually.
            </div>
            <div>
              <strong>Testing:</strong> All integrations start in sandbox mode. Switch to production when ready.
            </div>
            <div>
              <strong>Support:</strong> Need help with API credentials? Contact your carrier's developer support team.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}