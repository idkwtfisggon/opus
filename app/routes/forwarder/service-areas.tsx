import type { Route } from "./+types/service-areas";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { MapPin, Plus, Edit, Trash2, Globe, Clock, DollarSign, AlertCircle, Save, X } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Service Areas - Forwarder Portal" },
    { name: "description", content: "Manage your warehouse service coverage areas" },
  ];
}

interface ServiceAreaFormData {
  country: string;
  countryCode: string;
  states: string[];
  stateCodes: string[];
  isFullCountry: boolean;
  priority: number;
}

interface WarehouseServiceAreaData {
  warehouseId: string;
  coverage: ServiceAreaFormData[];
  handlingTimeHours: number;
  additionalFees?: number;
  specialInstructions?: string;
  maxPackagesPerDay?: number;
}

export default function ForwarderServiceAreasPage() {
  const [editingWarehouse, setEditingWarehouse] = useState<string | null>(null);
  const [serviceAreaData, setServiceAreaData] = useState<WarehouseServiceAreaData | null>(null);

  // Get forwarder data with warehouses and service areas
  const forwarderData = useQuery(api.warehouseServiceAreas.getForwarderServiceAreas);
  const availableRegions = useQuery(api.warehouseServiceAreas.getAvailableRegions);
  
  // Mutations
  const updateServiceArea = useMutation(api.warehouseServiceAreas.updateWarehouseServiceArea);
  const toggleServiceAreaStatus = useMutation(api.warehouseServiceAreas.toggleServiceAreaStatus);
  const seedRegions = useMutation(api.warehouseServiceAreas.seedGeographicRegions);

  if (!forwarderData || !availableRegions) {
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

  const handleEditServiceArea = (warehouseId: string) => {
    const warehouse = forwarderData.warehouses.find(w => w._id === warehouseId);
    if (!warehouse) return;

    const existingServiceArea = warehouse.serviceAreas[0]; // Assuming one service area per warehouse for now
    
    if (existingServiceArea) {
      setServiceAreaData({
        warehouseId,
        coverage: existingServiceArea.coverage,
        handlingTimeHours: existingServiceArea.handlingTimeHours,
        additionalFees: existingServiceArea.additionalFees,
        specialInstructions: existingServiceArea.specialInstructions,
        maxPackagesPerDay: existingServiceArea.maxPackagesPerDay,
      });
    } else {
      setServiceAreaData({
        warehouseId,
        coverage: [],
        handlingTimeHours: 24,
        additionalFees: 0,
        specialInstructions: "",
        maxPackagesPerDay: 100,
      });
    }
    
    setEditingWarehouse(warehouseId);
  };

  const handleSaveServiceArea = async () => {
    if (!serviceAreaData) return;

    try {
      await updateServiceArea({
        warehouseId: serviceAreaData.warehouseId,
        coverage: serviceAreaData.coverage,
        handlingTimeHours: serviceAreaData.handlingTimeHours,
        additionalFees: serviceAreaData.additionalFees,
        specialInstructions: serviceAreaData.specialInstructions,
        maxPackagesPerDay: serviceAreaData.maxPackagesPerDay,
      });
      
      setEditingWarehouse(null);
      setServiceAreaData(null);
    } catch (error) {
      console.error("Error saving service area:", error);
      alert("Failed to save service area. Please try again.");
    }
  };

  const handleAddCoverage = () => {
    if (!serviceAreaData) return;
    
    setServiceAreaData({
      ...serviceAreaData,
      coverage: [
        ...serviceAreaData.coverage,
        {
          country: "",
          countryCode: "",
          states: [],
          stateCodes: [],
          isFullCountry: true,
          priority: 1,
        }
      ]
    });
  };

  const handleUpdateCoverage = (index: number, updates: Partial<ServiceAreaFormData>) => {
    if (!serviceAreaData) return;
    
    const newCoverage = [...serviceAreaData.coverage];
    newCoverage[index] = { ...newCoverage[index], ...updates };
    
    setServiceAreaData({
      ...serviceAreaData,
      coverage: newCoverage
    });
  };

  const handleRemoveCoverage = (index: number) => {
    if (!serviceAreaData) return;
    
    setServiceAreaData({
      ...serviceAreaData,
      coverage: serviceAreaData.coverage.filter((_, i) => i !== index)
    });
  };

  const handleSeedRegions = async () => {
    try {
      await seedRegions();
      alert("Geographic regions seeded successfully!");
    } catch (error) {
      console.error("Error seeding regions:", error);
      alert("Failed to seed regions. They may already exist.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Service Areas</h1>
            <p className="text-gray-600">Configure which geographic areas your warehouses can serve</p>
          </div>
          <button
            onClick={handleSeedRegions}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
          >
            Seed Test Regions
          </button>
        </div>

        {forwarderData.warehouses.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-yellow-800">
                You need to create warehouses first before configuring service areas.{" "}
                <a href="/forwarder/warehouses" className="font-medium underline hover:no-underline">
                  Go to Warehouses
                </a>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Warehouses List */}
      <div className="px-4 sm:px-0 space-y-6">
        {forwarderData.warehouses.map((warehouse) => {
          const serviceArea = warehouse.serviceAreas[0];
          const isActive = serviceArea?.isActive !== false;
          
          return (
            <div key={warehouse._id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{warehouse.name}</h3>
                    <p className="text-sm text-gray-600">
                      {warehouse.city}, {warehouse.state} {warehouse.country}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                    <button
                      onClick={() => handleEditServiceArea(warehouse._id)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                    >
                      {serviceArea ? "Edit" : "Configure"}
                    </button>
                    {serviceArea && (
                      <button
                        onClick={() => toggleServiceAreaStatus({
                          warehouseId: warehouse._id,
                          isActive: !isActive
                        })}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          isActive 
                            ? "bg-red-100 hover:bg-red-200 text-red-700" 
                            : "bg-green-100 hover:bg-green-200 text-green-700"
                        }`}
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {serviceArea && (
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      Processing: {serviceArea.handlingTimeHours}h
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Extra Fee: ${serviceArea.additionalFees || 0}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Globe className="h-4 w-4 mr-2" />
                      Coverage: {serviceArea.coverage.length} area(s)
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Coverage Areas:</h4>
                    {serviceArea.coverage.map((coverage, index) => (
                      <div key={index} className="bg-gray-50 rounded-md p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{coverage.country}</span>
                            {coverage.isFullCountry ? (
                              <span className="ml-2 text-sm text-green-600">(Full Country)</span>
                            ) : (
                              <span className="ml-2 text-sm text-blue-600">
                                ({coverage.states?.length || 0} state(s))
                              </span>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            coverage.priority === 1 
                              ? "bg-blue-100 text-blue-800" 
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {coverage.priority === 1 ? "Primary" : "Secondary"}
                          </span>
                        </div>
                        {!coverage.isFullCountry && coverage.states && coverage.states.length > 0 && (
                          <div className="mt-2 text-sm text-gray-600">
                            States: {coverage.states.join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {serviceArea.specialInstructions && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                      <h4 className="text-sm font-medium text-yellow-900">Special Instructions:</h4>
                      <p className="text-sm text-yellow-800 mt-1">{serviceArea.specialInstructions}</p>
                    </div>
                  )}
                </div>
              )}

              {!serviceArea && (
                <div className="px-6 py-8 text-center text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No Service Area Configured</p>
                  <p className="text-sm">Configure which countries and regions this warehouse can serve</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Service Area Configuration Modal */}
      {editingWarehouse && serviceAreaData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Configure Service Area - {forwarderData.warehouses.find(w => w._id === editingWarehouse)?.name}
                </h2>
                <button
                  onClick={() => {
                    setEditingWarehouse(null);
                    setServiceAreaData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* Basic Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Processing Time (hours)
                  </label>
                  <input
                    type="number"
                    value={serviceAreaData.handlingTimeHours}
                    onChange={(e) => setServiceAreaData({
                      ...serviceAreaData,
                      handlingTimeHours: parseInt(e.target.value) || 24
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Time needed to process packages from this area</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Fee ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={serviceAreaData.additionalFees || 0}
                    onChange={(e) => setServiceAreaData({
                      ...serviceAreaData,
                      additionalFees: parseFloat(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Extra charge for serving this area</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Packages Per Day
                  </label>
                  <input
                    type="number"
                    value={serviceAreaData.maxPackagesPerDay || 100}
                    onChange={(e) => setServiceAreaData({
                      ...serviceAreaData,
                      maxPackagesPerDay: parseInt(e.target.value) || 100
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Instructions
                  </label>
                  <input
                    type="text"
                    value={serviceAreaData.specialInstructions || ""}
                    onChange={(e) => setServiceAreaData({
                      ...serviceAreaData,
                      specialInstructions: e.target.value
                    })}
                    placeholder="e.g., Rural areas may take longer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* Coverage Areas */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Coverage Areas</h3>
                  <button
                    onClick={handleAddCoverage}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Area
                  </button>
                </div>

                <div className="space-y-4">
                  {serviceAreaData.coverage.map((coverage, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">Coverage Area {index + 1}</h4>
                        <button
                          onClick={() => handleRemoveCoverage(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                          <select
                            value={coverage.country}
                            onChange={(e) => {
                              const selectedCountry = availableRegions.find(r => r.country === e.target.value);
                              handleUpdateCoverage(index, {
                                country: e.target.value,
                                countryCode: selectedCountry?.countryCode || "",
                                states: [],
                                stateCodes: [],
                                isFullCountry: true,
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="">Select Country</option>
                            {availableRegions.map(region => (
                              <option key={region.countryCode} value={region.country}>
                                {region.country}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Coverage Type</label>
                          <select
                            value={coverage.isFullCountry ? "full" : "states"}
                            onChange={(e) => handleUpdateCoverage(index, {
                              isFullCountry: e.target.value === "full",
                              states: e.target.value === "full" ? [] : coverage.states,
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="full">Full Country</option>
                            <option value="states">Specific States/Regions</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                          <select
                            value={coverage.priority}
                            onChange={(e) => handleUpdateCoverage(index, {
                              priority: parseInt(e.target.value)
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value={1}>Primary (Show First)</option>
                            <option value={2}>Secondary</option>
                          </select>
                        </div>
                      </div>

                      {!coverage.isFullCountry && coverage.country && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            States/Regions (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={coverage.states?.join(", ") || ""}
                            onChange={(e) => {
                              const stateNames = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                              handleUpdateCoverage(index, {
                                states: stateNames,
                                stateCodes: stateNames, // Simplified for now
                              });
                            }}
                            placeholder="e.g., California, New York, Texas"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enter state/region names separated by commas
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  {serviceAreaData.coverage.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Globe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No coverage areas configured</p>
                      <p className="text-sm">Add coverage areas to specify which regions this warehouse serves</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setEditingWarehouse(null);
                  setServiceAreaData(null);
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveServiceArea}
                disabled={serviceAreaData.coverage.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Service Area
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}