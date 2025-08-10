import type { Route } from "./+types/shipping-rates";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Plus, Edit, Trash2, Package, Truck, DollarSign, Clock, Save, X } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shipping Rates - Forwarder Portal" },
    { name: "description", content: "Manage your shipping zones and rates" },
  ];
}

export default function ForwarderShippingRatesPage() {
  const [editingRate, setEditingRate] = useState<string | null>(null);

  // Get shipping options and zones
  const shippingData = useQuery(api.forwarderShipping.getForwarderShippingOptions);
  
  // Mutations
  const createZone = useMutation(api.forwarderShipping.createShippingZone);
  const createRate = useMutation(api.forwarderShipping.createShippingRate);

  if (!shippingData) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="h-8 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateTestZone = async () => {
    try {
      const zoneId = await createZone({
        zoneName: "Europe Zone",
        countries: ["FR", "DE", "ES", "IT", "NL"]
      });
      
      // Create a test rate for this zone
      await createRate({
        zoneId,
        courier: "DHL Express",
        serviceType: "express",
        serviceName: "DHL Express International",
        serviceDescription: "Fast international shipping",
        weightSlabs: [
          { minWeight: 0, maxWeight: 1, flatRate: 25, label: "Up to 1kg" },
          { minWeight: 1, maxWeight: 5, ratePerKg: 20, label: "1-5kg" },
          { minWeight: 5, ratePerKg: 15, label: "5kg+" }
        ],
        handlingFee: 5,
        estimatedDaysMin: 2,
        estimatedDaysMax: 4,
        maxCapacity: 1000,
        isPublic: true,
        displayOrder: 1
      });
      
      alert("Test zone and rate created successfully!");
    } catch (error) {
      console.error("Error creating test data:", error);
      alert("Failed to create test zone and rate.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Shipping Rates</h1>
            <p className="text-gray-600">Manage your shipping zones and pricing</p>
          </div>
          <button
            onClick={handleCreateTestZone}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Test Zone & Rate
          </button>
        </div>
      </div>

      {/* Shipping Zones and Rates */}
      <div className="px-4 sm:px-0 space-y-6">
        {shippingData.zones.map((zone) => (
          <div key={zone._id} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{zone.zoneName}</h3>
                  <p className="text-sm text-gray-600">
                    Countries: {zone.countries.join(", ")}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  zone.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}>
                  {zone.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="px-6 py-4">
              {zone.rates.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Shipping Rates:</h4>
                  {zone.rates.map((rate) => (
                    <div key={rate._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h5 className="font-medium text-gray-900">{rate.serviceName}</h5>
                          <p className="text-sm text-gray-600">{rate.serviceDescription}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rate.serviceType === "express" ? "bg-red-100 text-red-800" :
                            rate.serviceType === "standard" ? "bg-blue-100 text-blue-800" :
                            "bg-green-100 text-green-800"
                          }`}>
                            {rate.serviceType}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rate.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}>
                            {rate.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Truck className="h-4 w-4 mr-2" />
                          {rate.courier}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          {rate.estimatedDaysMin}-{rate.estimatedDaysMax} days
                        </div>
                        <div className="flex items-center text-gray-600">
                          <DollarSign className="h-4 w-4 mr-2" />
                          ${rate.handlingFee} handling fee
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Package className="h-4 w-4 mr-2" />
                          {rate.weightSlabs.length} weight tiers
                        </div>
                      </div>

                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <h6 className="text-sm font-medium text-gray-900 mb-2">Weight-based Pricing:</h6>
                        <div className="space-y-1">
                          {rate.weightSlabs.map((slab, index) => (
                            <div key={index} className="text-sm text-gray-600">
                              {slab.label}: {slab.flatRate ? `$${slab.flatRate} flat` : `$${slab.ratePerKg}/kg`}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No shipping rates configured for this zone</p>
                  <p className="text-sm">Add rates to start offering shipping services</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {shippingData.zones.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Shipping Zones</h3>
            <p>Create your first shipping zone to start offering services</p>
            <p className="text-sm">Click "Create Test Zone & Rate" to get started with sample data</p>
          </div>
        )}
      </div>
    </div>
  );
}