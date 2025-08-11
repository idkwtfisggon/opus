import type { Route } from "./+types/service-areas";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { MapPin, Plus, Edit, Trash2, Globe, Clock, DollarSign, AlertCircle, Save, X } from "lucide-react";
import { getAllCountries, getStatesForCountry, basicAddressShape, getCountryCode } from "../../utils/addressValidation";

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
  const [showCreateWarehouse, setShowCreateWarehouse] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    stateCode: "",
    country: "",
    countryCode: "",
    postalCode: "",
    contactEmail: "",
    contactPhone: "",
    maxParcels: 1000,
    operatingHours: "24/7",
  });
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Get forwarder data with warehouses and service areas
  const forwarderData = useQuery(api.warehouseServiceAreas.getForwarderServiceAreas);
  
  // Get available countries and states using ISO codes
  const allCountries = getAllCountries();
  const availableStates = newWarehouse.countryCode ? getStatesForCountry(newWarehouse.countryCode) : [];
  
  // Debug: log countries to see if data is loading
  console.log('All countries:', allCountries.length, allCountries.slice(0, 5));
  
  // Mutations
  const updateServiceArea = useMutation(api.warehouseServiceAreas.updateWarehouseServiceArea);
  const toggleServiceAreaStatus = useMutation(api.warehouseServiceAreas.toggleServiceAreaStatus);
  const seedRegions = useMutation(api.warehouseServiceAreas.seedGeographicRegions);
  const createWarehouse = useMutation(api.warehouses.createWarehouse);

  if (!forwarderData) {
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
        useCustomRates: existingServiceArea.useCustomRates || false,
      });
    } else {
      setServiceAreaData({
        warehouseId,
        coverage: [],
        handlingTimeHours: 24,
        additionalFees: 0,
        specialInstructions: "",
        maxPackagesPerDay: 100,
        useCustomRates: false,
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
        useCustomRates: serviceAreaData.useCustomRates,
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

  const handleCreateWarehouse = async () => {
    // Validate address
    const validation = basicAddressShape({
      countryA2: newWarehouse.countryCode,
      state: newWarehouse.state,
      city: newWarehouse.city,
      line1: newWarehouse.address,
      postal: newWarehouse.postalCode,
    });
    
    if (!validation.ok) {
      setValidationErrors([validation.reason]);
      return;
    }
    
    // Additional validation
    const errors: string[] = [];
    if (!newWarehouse.name.trim()) errors.push("Warehouse name is required");
    if (!newWarehouse.contactEmail.trim()) errors.push("Contact email is required");
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors([]);
    
    try {
      const warehouseId = await createWarehouse({
        forwarderId: forwarderData.forwarder._id,
        name: newWarehouse.name,
        address: newWarehouse.address,
        city: newWarehouse.city,
        state: newWarehouse.state,
        country: newWarehouse.country,
        postalCode: newWarehouse.postalCode,
        maxParcels: newWarehouse.maxParcels,
        maxWeightKg: 50, // Default to 50kg max weight per parcel
        maxDimensionsCm: "100 x 100 x 100", // Default max dimensions
      });
      
      setShowCreateWarehouse(false);
      setNewWarehouse({
        name: "",
        address: "",
        city: "",
        state: "",
        stateCode: "",
        country: "",
        countryCode: "",
        postalCode: "",
        contactEmail: "",
        contactPhone: "",
        maxParcels: 1000,
        operatingHours: "24/7",
      });
      
      // Automatically start configuring service areas for the new warehouse
      setTimeout(() => {
        handleEditServiceArea(warehouseId);
      }, 500);
    } catch (error) {
      console.error("Error creating warehouse:", error);
      alert("Failed to create warehouse. Please try again.");
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
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCreateWarehouse(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Warehouse
            </button>
            <button
              onClick={handleSeedRegions}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              Seed Test Regions
            </button>
          </div>
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

      {/* Warehouse Creation Modal */}
      {showCreateWarehouse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Add New Warehouse</h2>
                <button
                  onClick={() => {
                    setShowCreateWarehouse(false);
                    setNewWarehouse({
                      name: "",
                      address: "",
                      city: "",
                      state: "",
                      country: "",
                      postalCode: "",
                      contactEmail: "",
                      contactPhone: "",
                      maxParcels: 1000,
                      operatingHours: "24/7",
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warehouse Name *
                  </label>
                  <input
                    type="text"
                    value={newWarehouse.name}
                    onChange={(e) => setNewWarehouse({...newWarehouse, name: e.target.value})}
                    placeholder="e.g., Paris Central Hub"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Parcels Capacity
                  </label>
                  <input
                    type="number"
                    value={newWarehouse.maxParcels}
                    onChange={(e) => setNewWarehouse({...newWarehouse, maxParcels: parseInt(e.target.value) || 1000})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                </div>
              </div>

              {/* Location - Geographic Hierarchy */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Location</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <select
                      value={newWarehouse.country}
                      onChange={(e) => {
                        console.log('Country selected:', e.target.value);
                        const countryName = e.target.value;
                        const countryCode = getCountryCode(countryName);
                        console.log('Country code:', countryCode);
                        setNewWarehouse({
                          ...newWarehouse, 
                          country: countryName,
                          countryCode: countryCode || "",
                          state: "", // Reset state when country changes
                          stateCode: "", // Reset state code when country changes  
                          city: ""   // Reset city when country changes
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Country</option>
                      {allCountries.map(country => (
                        <option key={country.code} value={country.name}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State/Province *
                    </label>
                    {availableStates.length > 0 ? (
                      <select
                        value={newWarehouse.state}
                        onChange={(e) => {
                          const stateName = e.target.value;
                          const selectedState = availableStates.find(s => s.name === stateName);
                          setNewWarehouse({
                            ...newWarehouse, 
                            state: stateName,
                            stateCode: selectedState?.code || "",
                            city: "" // Reset city when state changes
                          });
                        }}
                        disabled={!newWarehouse.country}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Select State/Province</option>
                        {availableStates.map(state => (
                          <option key={state.code} value={state.name}>
                            {state.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={newWarehouse.state}
                        onChange={(e) => setNewWarehouse({...newWarehouse, state: e.target.value})}
                        disabled={!newWarehouse.country}
                        placeholder="Enter state/province"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    )}
                    {!newWarehouse.country && (
                      <p className="text-xs text-gray-500 mt-1">Select a country first</p>
                    )}
                    {newWarehouse.country && availableStates.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No pre-defined states available, please enter manually</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={newWarehouse.city}
                      onChange={(e) => setNewWarehouse({...newWarehouse, city: e.target.value})}
                      placeholder="Enter city name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Address Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={newWarehouse.address}
                    onChange={(e) => setNewWarehouse({...newWarehouse, address: e.target.value})}
                    placeholder="123 Rue de la Paix"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    value={newWarehouse.postalCode}
                    onChange={(e) => setNewWarehouse({...newWarehouse, postalCode: e.target.value})}
                    placeholder="75001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Contact Information</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email *
                    </label>
                    <input
                      type="email"
                      value={newWarehouse.contactEmail}
                      onChange={(e) => setNewWarehouse({...newWarehouse, contactEmail: e.target.value})}
                      placeholder="warehouse@company.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={newWarehouse.contactPhone}
                      onChange={(e) => setNewWarehouse({...newWarehouse, contactPhone: e.target.value})}
                      placeholder="+33 1 23 45 67 89"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    value={newWarehouse.operatingHours}
                    onChange={(e) => setNewWarehouse({...newWarehouse, operatingHours: e.target.value})}
                    placeholder="Mon-Fri 9AM-6PM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-red-900">Please fix the following errors:</h4>
                      <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateWarehouse(false);
                  setNewWarehouse({
                    name: "",
                    address: "",
                    city: "",
                    state: "",
                    stateCode: "",
                    country: "",
                    countryCode: "",
                    postalCode: "",
                    contactEmail: "",
                    contactPhone: "",
                    maxParcels: 1000,
                    operatingHours: "24/7",
                  });
                  setValidationErrors([]);
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWarehouse}
                disabled={!newWarehouse.name || !newWarehouse.address || !newWarehouse.city || !newWarehouse.state || !newWarehouse.country || !newWarehouse.postalCode || !newWarehouse.contactEmail}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Warehouse
              </button>
            </div>
          </div>
        </div>
      )}

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

              {/* Rate Configuration */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Rate Configuration</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <input
                          type="radio"
                          id="useDefaultRates"
                          name="rateMode"
                          checked={!serviceAreaData.useCustomRates}
                          onChange={() => setServiceAreaData({
                            ...serviceAreaData,
                            useCustomRates: false
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <label htmlFor="useDefaultRates" className="text-sm font-medium text-gray-900">
                          Use Forwarder Default Rates
                        </label>
                      </div>
                      <p className="text-xs text-gray-600 ml-7">
                        Apply the same shipping rates configured in Forwarder Settings across all shipping zones
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 mt-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <input
                          type="radio"
                          id="useCustomRates"
                          name="rateMode"
                          checked={serviceAreaData.useCustomRates}
                          onChange={() => setServiceAreaData({
                            ...serviceAreaData,
                            useCustomRates: true
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <label htmlFor="useCustomRates" className="text-sm font-medium text-gray-900">
                          Use Custom Rates for This Warehouse
                        </label>
                      </div>
                      <p className="text-xs text-gray-600 ml-7">
                        Set specific shipping rates for this warehouse location (overrides default rates)
                      </p>
                      {serviceAreaData.useCustomRates && (
                        <div className="ml-7 mt-3 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm text-blue-800">
                            <strong>Note:</strong> You'll need to configure custom rates for each shipping zone after saving this service area.
                            Custom rates will override your forwarder default rates for this warehouse only.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
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