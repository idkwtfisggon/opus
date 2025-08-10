import type { Route } from "./+types/create-order";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getAllCountries } from "../../utils/countryZones";
import { Package, Truck, Clock, MapPin, CreditCard, Copy, Check, AlertTriangle, Search } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Create Order - Customer Portal" },
    { name: "description", content: "Create a new shipping order" },
  ];
}



const PACKAGE_CATEGORIES = [
  "Electronics",
  "Clothing & Accessories", 
  "Books & Media",
  "Health & Beauty",
  "Home & Garden",
  "Sports & Outdoors",
  "Toys & Games",
  "Personal Items",
  "Other"
];

export default function CreateOrderPage() {
  const [step, setStep] = useState<"package" | "search" | "select" | "confirm">("package");
  const [packageDetails, setPackageDetails] = useState({
    fromCountry: "US",
    fromState: "",
    toCountry: "SG", 
    weight: "",
    declaredValue: "",
    currency: "USD",
    merchantName: "",
    merchantOrderId: "",
    category: "",
    dimensions: "",
    description: "",
    specialInstructions: "",
    sortBy: "distance" as "distance" | "price" | "speed"
  });
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Get all countries from your comprehensive list
  const allCountries = getAllCountries();
  
  // Helper function to get country code from country name
  const getCountryCode = (countryName: string) => {
    const country = allCountries.find(c => c.name === countryName);
    return country?.code || countryName;
  };
  
  // Get real shipping options from Convex with service area filtering
  const shippingOptions = useQuery(
    api.customerOrders.searchShippingOptions,
    step === "search" && packageDetails.weight ? {
      fromCountry: packageDetails.fromCountry,
      fromCountryCode: getCountryCode(packageDetails.fromCountry),
      fromState: packageDetails.fromState || undefined,
      toCountry: packageDetails.toCountry,
      weight: parseFloat(packageDetails.weight),
      declaredValue: parseFloat(packageDetails.declaredValue) || 0,
      sortBy: packageDetails.sortBy,
    } : "skip"
  );

  // Real order creation function
  const createOrder = useMutation(api.customerOrders.createCustomerOrder);
  
  // Get real shipping address when order is created
  const generateAddress = useQuery(
    api.customerOrders.generateShippingAddress,
    selectedRate?.orderId ? { orderId: selectedRate.orderId } : "skip"
  );

  const handleSearch = () => {
    if (!packageDetails.weight) {
      alert("Please enter package weight (estimate is fine)");
      return;
    }
    setStep("search");
  };

  // Use your complete country list with proper names and codes
  const availableCountries = allCountries;

  const handleSelectRate = async (option: any) => {
    try {
      const orderId = await createOrder({
        rateId: option.rateId,
        merchantName: packageDetails.merchantName || "Unknown Merchant",
        merchantOrderId: packageDetails.merchantOrderId,
        declaredWeight: parseFloat(packageDetails.weight),
        declaredValue: parseFloat(packageDetails.declaredValue) || 0,
        currency: packageDetails.currency,
        dimensions: packageDetails.dimensions,
        packageDescription: packageDetails.description,
        specialInstructions: packageDetails.specialInstructions,
      });
      
      setSelectedRate({ ...option, orderId });
      setStep("confirm");
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Failed to create order. Please try again.");
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case "high": return "text-green-600 bg-green-100";
      case "medium": return "text-yellow-600 bg-yellow-100";
      case "low": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Order</h1>
            <p className="text-gray-600">Set up a new package forwarding request</p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {["Package Details", "Search Options", "Select Service", "Confirm & Copy"].map((label, index) => {
              const stepNames = ["package", "search", "select", "confirm"];
              const currentIndex = stepNames.indexOf(step);
              const isActive = index === currentIndex;
              const isCompleted = index < currentIndex;

              return (
                <div key={label} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted ? "bg-green-100 border-green-500 text-green-600" :
                    isActive ? "bg-blue-100 border-blue-500 text-blue-600" :
                    "bg-gray-100 border-gray-300 text-gray-400"
                  }`}>
                    {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
                  </div>
                  <span className={`ml-3 font-medium ${
                    isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-400"
                  }`}>
                    {label}
                  </span>
                  {index < 3 && <div className="flex-1 h-px bg-gray-300 mx-4" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step 1: Package Details */}
      {step === "package" && (
        <div className="px-4 sm:px-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Package Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Route Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shopping From
                </label>
                <select
                  value={packageDetails.fromCountry}
                  onChange={(e) => setPackageDetails(prev => ({ ...prev, fromCountry: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {availableCountries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipping To
                </label>
                <select
                  value={packageDetails.toCountry}
                  onChange={(e) => setPackageDetails(prev => ({ ...prev, toCountry: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {availableCountries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* State/Province selection for countries that support it */}
              {(packageDetails.fromCountry === "US" || packageDetails.fromCountry === "FR" || packageDetails.fromCountry === "DE") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province <span className="text-gray-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={packageDetails.fromState}
                    onChange={(e) => setPackageDetails(prev => ({ ...prev, fromState: e.target.value }))}
                    placeholder={packageDetails.fromCountry === "US" ? "California" : packageDetails.fromCountry === "FR" ? "Provence-Alpes-Côte d'Azur" : "Bavaria"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {packageDetails.fromCountry === "US" ? "State name (e.g., California, New York)" : 
                     packageDetails.fromCountry === "FR" ? "Region name (e.g., Provence-Alpes-Côte d'Azur)" :
                     "State name (e.g., Bavaria, Berlin)"}
                  </p>
                </div>
              )}

              {/* Sorting preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Results By
                </label>
                <select
                  value={packageDetails.sortBy}
                  onChange={(e) => setPackageDetails(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="distance">Proximity (Closest first)</option>
                  <option value="price">Price (Cheapest first)</option>
                  <option value="speed">Speed (Fastest first)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">How should we prioritize your shipping options?</p>
              </div>

              {/* Package Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={packageDetails.weight}
                  onChange={(e) => setPackageDetails(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="1.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">Estimate is fine - can be updated when package arrives</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Declared Value <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <div className="flex">
                  <select
                    value={packageDetails.currency}
                    onChange={(e) => setPackageDetails(prev => ({ ...prev, currency: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-l-md w-20"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="SGD">SGD</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={packageDetails.declaredValue}
                    onChange={(e) => setPackageDetails(prev => ({ ...prev, declaredValue: e.target.value }))}
                    placeholder="50.00"
                    className="flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-md"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">For insurance purposes only - kept confidential</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store/Merchant Name <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={packageDetails.merchantName}
                  onChange={(e) => setPackageDetails(prev => ({ ...prev, merchantName: e.target.value }))}
                  placeholder="Amazon, eBay, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Category <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <select
                  value={packageDetails.category}
                  onChange={(e) => setPackageDetails(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select category...</option>
                  {PACKAGE_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Helps with customs classification</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Description <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={packageDetails.description}
                  onChange={(e) => setPackageDetails(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="iPhone 15 Pro, Blue color"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSearch}
                disabled={!packageDetails.weight}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Find Shipping Options
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Search Results */}
      {step === "search" && (
        <div className="px-4 sm:px-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Available Shipping Options
              </h2>
              <button
                onClick={() => setStep("package")}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                ← Edit Package Details
              </button>
            </div>

            {shippingOptions === undefined ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Searching for shipping options...</p>
              </div>
            ) : shippingOptions.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Options Available</h3>
                <p className="text-gray-500">No shipping services found for this route. Please try different countries or contact support.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {shippingOptions.map((option: any) => (
                  <div key={option.rateId} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {option.courier.logo ? (
                            <img src={option.courier.logo} alt={option.courier.name} className="h-8 w-8 object-contain" />
                          ) : (
                            <Truck className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{option.forwarder.name}</h3>
                          <p className="text-sm text-gray-600">{option.service.name}</p>
                          <p className="text-xs text-gray-500">{option.service.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          ${option.pricing.totalPrice.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">{option.pricing.currency}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Truck className="h-4 w-4 mr-2" />
                        {option.courier.name}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        {option.delivery.estimatedDaysMin}-{option.delivery.estimatedDaysMax} days
                      </div>
                      <div className="flex items-center text-sm">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(option.availability.status)}`}>
                          {option.availability.percentage}% Available
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {option.features.trackingIncluded && <span>✓ Tracking</span>}
                        {option.features.insuranceIncluded && <span>✓ Insurance</span>}
                        {option.features.requiresSignature && <span>✓ Signature Required</span>}
                      </div>
                      <button
                        onClick={() => handleSelectRate(option)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        Select This Service
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Confirmation & Address Copy */}
      {step === "confirm" && generateAddress && (
        <div className="px-4 sm:px-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Created Successfully!</h2>
              <p className="text-gray-600">Use the address below when checking out on the merchant's website</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Ship Your Package To:</h3>
                <button
                  onClick={() => copyToClipboard(generateAddress.formattedAddress, "full")}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  {copiedField === "full" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  Copy Full Address
                </button>
              </div>

              <div className="space-y-2 text-gray-900 font-mono text-sm">
                <div className="flex items-center justify-between">
                  <span>{generateAddress.recipientName}</span>
                  <button
                    onClick={() => copyToClipboard(generateAddress.recipientName, "name")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {copiedField === "name" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span>{generateAddress.companyName}</span>
                  <button
                    onClick={() => copyToClipboard(generateAddress.companyName, "company")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {copiedField === "company" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span>{generateAddress.address}</span>
                  <button
                    onClick={() => copyToClipboard(generateAddress.address, "address")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {copiedField === "address" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span>{generateAddress.city}, {generateAddress.state} {generateAddress.postalCode}</span>
                  <button
                    onClick={() => copyToClipboard(`${generateAddress.city}, ${generateAddress.state} ${generateAddress.postalCode}`, "city")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {copiedField === "city" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span>{generateAddress.country}</span>
                  <button
                    onClick={() => copyToClipboard(generateAddress.country, "country")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {copiedField === "country" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Customer ID: {generateAddress.customerId}</p>
                    <p className="text-xs text-yellow-600">Include this in your package or order notes</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(generateAddress.customerId, "customerId")}
                    className="text-yellow-600 hover:text-yellow-700"
                  >
                    {copiedField === "customerId" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
              <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                <li>Copy the shipping address above</li>
                <li>Go to {packageDetails.merchantName || "the online store"} and complete your purchase</li>
                <li>Use the copied address as your shipping address</li>
                <li>We'll notify you when your package arrives at our warehouse</li>
                <li>Track your order progress in "My Orders"</li>
              </ol>
            </div>

            <div className="flex justify-between">
              <a
                href="/customer/orders"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                View My Orders
              </a>
              <a
                href="/customer/create-order"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Create Another Order
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}