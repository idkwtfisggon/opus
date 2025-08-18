import type { Route } from "./+types/service-areas";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { MapPin, Plus, Edit, Trash2, Globe, Clock, DollarSign, AlertCircle, Save, X, Search, PenTool } from "lucide-react";
import { getAllCountries, getStatesForCountry, basicAddressShape, getCountryCode } from "../../utils/addressValidation";
import WarehouseOperatingHours from "../../components/warehouse/WarehouseOperatingHours";
import AddressAutocomplete from "../../components/ui/AddressAutocomplete";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Service Areas - Forwarder Portal" },
    { name: "description", content: "Manage your warehouse service coverage areas" },
  ];
}


export default function ForwarderServiceAreasPage() {
  const [editingWarehouse, setEditingWarehouse] = useState<string | null>(null);
  const [editingWarehouseData, setEditingWarehouseData] = useState<any>(null);
  const [editingOperatingHours, setEditingOperatingHours] = useState<any>(null);
  const [editingHolidaySchedule, setEditingHolidaySchedule] = useState<any[]>([]);
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
  
  // Google autocomplete state
  const [useGoogleAutocomplete, setUseGoogleAutocomplete] = useState(true);
  const [useGoogleAutocompleteEdit, setUseGoogleAutocompleteEdit] = useState(true);

  // Handle Google Places address selection for new warehouse
  const handleGoogleAddressSelectNew = (addressData: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  }) => {
    const countryCode = getCountryCode(addressData.country) || addressData.country;
    setNewWarehouse(prev => ({
      ...prev,
      address: addressData.address,
      city: addressData.city,
      state: addressData.state,
      stateCode: addressData.state,
      country: addressData.country,
      countryCode: countryCode,
      postalCode: addressData.postalCode,
    }));
  };

  // Handle Google Places address selection for editing warehouse
  const handleGoogleAddressSelectEdit = (addressData: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  }) => {
    const countryCode = getCountryCode(addressData.country) || addressData.country;
    setEditingWarehouseData(prev => ({
      ...prev,
      address: addressData.address,
      city: addressData.city,
      state: addressData.state,
      stateCode: addressData.state,
      country: addressData.country,
      countryCode: countryCode,
      postalCode: addressData.postalCode,
    }));
  };

  // Get forwarder data with warehouses and service areas
  const forwarderData = useQuery(api.warehouseServiceAreas.getForwarderServiceAreas);
  
  // Get shipping settings (zones and rates) for the forwarder
  const shippingSettings = useQuery(
    api.forwarderSettings.getForwarderSettings,
    forwarderData?.forwarder ? { forwarderId: forwarderData.forwarder._id } : "skip"
  );
  
  // Get available countries and states using ISO codes
  const allCountries = getAllCountries();
  const availableStates = newWarehouse.countryCode ? getStatesForCountry(newWarehouse.countryCode) : [];
  
  // Debug: log countries to see if data is loading
  console.log('All countries:', allCountries.length, allCountries.slice(0, 5));
  
  // Mutations
  const createWarehouse = useMutation(api.warehouses.createWarehouse);
  const updateWarehouse = useMutation(api.warehouses.updateWarehouse);


  // Helper function to get all shipping rates that apply to a specific warehouse
  const getWarehouseRates = (warehouseId: string) => {
    if (!shippingSettings?.rates) return [];
    
    return shippingSettings.rates.filter((rate: any) => {
      // Rate applies if it's either:
      // 1. A default rate (no warehouseId = applies to all warehouses)
      // 2. A warehouse-specific rate that matches this warehouse
      return rate.isActive && (!rate.warehouseId || rate.warehouseId === warehouseId);
    });
  };

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

    // Set warehouse data for editing
    setEditingWarehouseData({
      name: warehouse.name,
      address: warehouse.address,
      city: warehouse.city,
      state: warehouse.state,
      country: warehouse.country,
      postalCode: warehouse.postalCode,
      maxParcels: warehouse.maxParcels || 1000,
    });

    // Set operating hours (default to regular office hours if not set)
    setEditingOperatingHours(warehouse.operatingHours || {
      monday: { open: "09:00", close: "17:00" },
      tuesday: { open: "09:00", close: "17:00" },
      wednesday: { open: "09:00", close: "17:00" },
      thursday: { open: "09:00", close: "17:00" },
      friday: { open: "09:00", close: "17:00" },
      saturday: { closed: true },
      sunday: { closed: true },
    });

    // Set holiday schedule
    setEditingHolidaySchedule(warehouse.holidaySchedule || []);
    
    setEditingWarehouse(warehouseId);
  };

  const handleUpdateWarehouse = async () => {
    if (!editingWarehouseData || !editingWarehouse) return;

    try {
      await updateWarehouse({
        warehouseId: editingWarehouse,
        name: editingWarehouseData.name,
        address: editingWarehouseData.address,
        city: editingWarehouseData.city,
        state: editingWarehouseData.state,
        country: editingWarehouseData.country,
        postalCode: editingWarehouseData.postalCode,
        maxParcels: editingWarehouseData.maxParcels,
        operatingHours: editingOperatingHours,
        holidaySchedule: editingHolidaySchedule,
      });
      
      setEditingWarehouse(null);
      setEditingWarehouseData(null);
      setEditingOperatingHours(null);
      setEditingHolidaySchedule([]);
      alert('Warehouse details updated successfully!');
    } catch (error) {
      console.error("Error updating warehouse:", error);
      alert("Failed to update warehouse details. Please try again.");
    }
  };

  const handleOperatingHoursChange = (operatingHours: any, holidaySchedule: any[]) => {
    setEditingOperatingHours(operatingHours);
    setEditingHolidaySchedule(holidaySchedule);
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
            <p className="text-gray-600">View your warehouses and their available shipping rates</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCreateWarehouse(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Warehouse
            </button>
          </div>
        </div>

        {forwarderData.warehouses.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-yellow-800">
                Click "Add Warehouse" above to create your first warehouse location.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Warehouses List */}
      <div className="px-4 sm:px-0 space-y-6">
        {forwarderData.warehouses.map((warehouse) => {
          
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
                    <button
                      onClick={() => handleEditServiceArea(warehouse._id)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                    >
                      Edit Warehouse
                    </button>
                  </div>
                </div>
              </div>


              {/* Always show applicable shipping rates for this warehouse */}
              <div className="px-6 py-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Available Shipping Rates</h4>
                {(() => {
                  const warehouseRates = getWarehouseRates(warehouse._id);
                  
                  if (warehouseRates.length === 0) {
                    return (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-yellow-800">
                              No shipping rates configured for this warehouse.
                            </p>
                            <p className="text-xs text-yellow-700 mt-1">
                              <a 
                                href="/forwarder/settings" 
                                className="underline hover:no-underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Configure shipping rates in Settings →
                              </a>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {warehouseRates.map((rate: any) => {
                        const zone = shippingSettings?.zones?.find((z: any) => z._id === rate.zoneId);
                        const warehouseSpecific = rate.warehouseId ? 
                          forwarderData.warehouses.find(w => w._id === rate.warehouseId)?.name : null;
                        
                        return (
                          <div key={rate._id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-green-900 truncate">
                                    {rate.courier} - {rate.serviceType}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {warehouseSpecific && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                      {warehouseSpecific}
                                    </span>
                                  )}
                                  {!rate.warehouseId && (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                      All Warehouses
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm font-semibold text-green-900 ml-2">
                                {rate.weightSlabs?.[0]?.flatRate 
                                  ? `$${rate.weightSlabs[0].flatRate}` 
                                  : rate.weightSlabs?.[0]?.ratePerKg 
                                  ? `$${rate.weightSlabs[0].ratePerKg}/kg`
                                  : 'Varies'}
                              </span>
                            </div>
                            <div className="text-xs text-green-800">
                              Zone: {zone?.name || 'Unknown'} • {rate.estimatedDaysMin}-{rate.estimatedDaysMax} days
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

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

              {/* Address Input Method Toggle */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">Address Input Method</h4>
                  <p className="text-sm text-gray-600">Choose how you'd like to enter the warehouse address</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseGoogleAutocomplete(true)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      useGoogleAutocomplete 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Search className="w-3 h-3 mr-1" />
                    Smart Search
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseGoogleAutocomplete(false)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      !useGoogleAutocomplete 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <PenTool className="w-3 h-3 mr-1" />
                    Manual Entry
                  </button>
                </div>
              </div>

              {/* Address Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  {useGoogleAutocomplete ? (
                    // Google Places Autocomplete
                    <AddressAutocomplete
                      label="Street Address"
                      placeholder="Start typing warehouse address (e.g., 123 Industrial Drive)"
                      value={newWarehouse.address}
                      onChange={(value) => setNewWarehouse({...newWarehouse, address: value})}
                      onAddressSelect={handleGoogleAddressSelectNew}
                      countryBias={newWarehouse.countryCode && newWarehouse.countryCode !== '' ? newWarehouse.countryCode : undefined}
                      required
                      className="w-full"
                    />
                  ) : (
                    // Manual address input
                    <>
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
                    </>
                  )}
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

      {/* Warehouse Edit Modal */}
      {editingWarehouse && editingWarehouseData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit Warehouse - {forwarderData.warehouses.find(w => w._id === editingWarehouse)?.name}
                </h2>
                <button
                  onClick={() => {
                    setEditingWarehouse(null);
                    setEditingWarehouseData(null);
                    setEditingOperatingHours(null);
                    setEditingHolidaySchedule([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* Basic Warehouse Details */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Warehouse Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse Name</label>
                    <input
                      type="text"
                      value={editingWarehouseData.name}
                      onChange={(e) => setEditingWarehouseData({
                        ...editingWarehouseData,
                        name: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Parcels Capacity</label>
                    <input
                      type="number"
                      value={editingWarehouseData.maxParcels}
                      onChange={(e) => setEditingWarehouseData({
                        ...editingWarehouseData,
                        maxParcels: parseInt(e.target.value) || 1000
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                    />
                  </div>
                  
                  <div>
                    {/* Address Input Method Toggle for Edit */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Address Input Method</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setUseGoogleAutocompleteEdit(true)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            useGoogleAutocompleteEdit 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <Search className="w-3 h-3 mr-1" />
                          Smart
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseGoogleAutocompleteEdit(false)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            !useGoogleAutocompleteEdit 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <PenTool className="w-3 h-3 mr-1" />
                          Manual
                        </button>
                      </div>
                    </div>

                    {useGoogleAutocompleteEdit ? (
                      // Google Places Autocomplete for edit
                      <AddressAutocomplete
                        label="Street Address"
                        placeholder="Start typing warehouse address"
                        value={editingWarehouseData.address}
                        onChange={(value) => setEditingWarehouseData({
                          ...editingWarehouseData,
                          address: value
                        })}
                        onAddressSelect={handleGoogleAddressSelectEdit}
                        countryBias={editingWarehouseData.countryCode && editingWarehouseData.countryCode !== '' ? editingWarehouseData.countryCode : undefined}
                        className="w-full"
                      />
                    ) : (
                      // Manual address input for edit
                      <>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                        <input
                          type="text"
                          value={editingWarehouseData.address}
                          onChange={(e) => setEditingWarehouseData({
                            ...editingWarehouseData,
                            address: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={editingWarehouseData.city}
                      onChange={(e) => setEditingWarehouseData({
                        ...editingWarehouseData,
                        city: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                    <input
                      type="text"
                      value={editingWarehouseData.state}
                      onChange={(e) => setEditingWarehouseData({
                        ...editingWarehouseData,
                        state: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <input
                      type="text"
                      value={editingWarehouseData.country}
                      onChange={(e) => setEditingWarehouseData({
                        ...editingWarehouseData,
                        country: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                    <input
                      type="text"
                      value={editingWarehouseData.postalCode}
                      onChange={(e) => setEditingWarehouseData({
                        ...editingWarehouseData,
                        postalCode: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Operating Hours Component */}
              {editingOperatingHours !== null && (
                <WarehouseOperatingHours
                  warehouseName={editingWarehouseData.name}
                  currentOperatingHours={editingOperatingHours}
                  currentHolidaySchedule={editingHolidaySchedule}
                  onOperatingHoursChange={handleOperatingHoursChange}
                />
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setEditingWarehouse(null);
                  setEditingWarehouseData(null);
                  setEditingOperatingHours(null);
                  setEditingHolidaySchedule([]);
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateWarehouse}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Update Warehouse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}