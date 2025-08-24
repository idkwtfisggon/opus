import type { Route } from "./+types/settings";
import { getServerAuth } from "~/contexts/auth";
import { redirect } from "react-router";
import { Settings as SettingsIcon, Package, MapPin, CreditCard, Bell, Shield, Globe, Palette, Plus, Edit2, Trash2, CheckCircle, AlertCircle, Info, X, Lightbulb, Search, PenTool } from "lucide-react";
import React, { useState } from "react";
import { useAuth } from "~/contexts/auth";
import { useMutation, useQuery } from "convex/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { api } from "../../../convex/_generated/api";
import { validateFullAddress, getAllCountries, getStatesForCountry, type AddressValidationResult } from "~/utils/addressValidation";
import AddressAutocomplete from "~/components/ui/AddressAutocomplete";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getServerAuth(args.request);
  
  if (!userId) {
    return redirect("/sign-in");
  }

  return { userId };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Settings - Customer Portal" },
    { name: "description", content: "Manage your shipping preferences and account settings" },
  ];
}

export default function CustomerSettings({ loaderData }: Route.ComponentProps) {
  const { user } = useAuth();
  
  // Real-time user data
  const userProfile = useQuery(api.users.getUserProfile);
  
  // Mutations
  const updateProfile = useMutation(api.users.updateUserProfile);
  const updateNotifications = useMutation(api.users.updateNotificationSettings);
  const updatePrivacySettings = useMutation(api.users.updatePrivacySettings);
  const addCustomerAddress = useMutation(api.customerDashboard.addCustomerAddress);
  const updateCustomerAddress = useMutation(api.customerDashboard.updateCustomerAddress);
  const deleteCustomerAddress = useMutation(api.customerDashboard.deleteCustomerAddress);
  
  // Get customer addresses
  const customerAddresses = useQuery(api.customerDashboard.getCustomerAddresses);

  // Component state
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  
  // Address form state
  const [addressData, setAddressData] = useState({
    label: "",
    recipientName: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phoneNumber: "",
    isDefault: false
  });
  
  const [addressValidation, setAddressValidation] = useState<AddressValidationResult | null>(null);
  const [countries] = useState(() => getAllCountries());
  const [states, setStates] = useState<Array<{ code: string; name: string }>>([]);
  const [useGoogleAutocomplete, setUseGoogleAutocomplete] = useState(true);
  
  // Settings state (load from userProfile)
  const [settings, setSettings] = useState({
    // Shipping Preferences  
    defaultShippingSpeed: "standard",
    consolidatePackages: true,
    autoRequestShipping: false,
    
    
    // Display Preferences
    currency: "USD",
    language: "en",
    timezone: "America/New_York",
    theme: "light"
  });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };
  
  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Load settings from userProfile when available
  React.useEffect(() => {
    if (userProfile || user) {
      setSettings(prev => ({
        ...prev,
        currency: userProfile?.preferredCurrency || "USD",
        language: userProfile?.language || "en",
        timezone: userProfile?.timezone || "America/New_York",
      }));
    }
  }, [userProfile, user]);
  
  // Update states when country changes
  React.useEffect(() => {
    if (addressData.country) {
      const countryStates = getStatesForCountry(addressData.country);
      setStates(countryStates);
      if (countryStates.length === 0 || !countryStates.some(s => s.code === addressData.state)) {
        setAddressData(prev => ({ ...prev, state: "" }));
      }
    }
  }, [addressData.country]);

  // Validate address when fields change
  React.useEffect(() => {
    if (addressData.street || addressData.city || addressData.postalCode || addressData.country) {
      const validation = validateFullAddress({
        countryA2: addressData.country,
        state: addressData.state,
        city: addressData.city,
        line1: addressData.street,
        postal: addressData.postalCode
      });
      setAddressValidation(validation);
    } else {
      setAddressValidation(null);
    }
  }, [addressData.street, addressData.city, addressData.state, addressData.country, addressData.postalCode]);

  const handleAddressChange = (field: string, value: string | boolean) => {
    setAddressData(prev => ({ ...prev, [field]: value }));
  };

  // Handle Google Places address selection
  const handleGoogleAddressSelect = (addressData: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  }) => {
    setAddressData(prev => ({
      ...prev,
      street: addressData.address,
      city: addressData.city,
      state: addressData.state,
      country: addressData.country,
      postalCode: addressData.postalCode,
    }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Save profile preferences
      await updateProfile({
        language: settings.language,
        timezone: settings.timezone,
      });
      
      
      showNotification("Settings saved successfully!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      showNotification(`Failed to save settings: ${error.message || error}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!addressValidation?.isValid) {
      showNotification('Please fix address validation errors before saving', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (editingAddress) {
        // Update existing address
        await updateCustomerAddress({
          addressId: editingAddress,
          label: addressData.label,
          recipientName: addressData.recipientName,
          address: addressData.street,
          city: addressData.city,
          state: addressData.state,
          postalCode: addressData.postalCode,
          country: addressData.country,
          phoneNumber: addressData.phoneNumber,
          isDefault: addressData.isDefault,
        });
      } else {
        // Create new address
        await addCustomerAddress({
          label: addressData.label,
          recipientName: addressData.recipientName,
          address: addressData.street,
          city: addressData.city,
          state: addressData.state,
          country: addressData.country,
          postalCode: addressData.postalCode,
          phoneNumber: addressData.phoneNumber,
          isDefault: addressData.isDefault,
        });
      }
      
      // Reset form
      setAddressData({
        label: "",
        recipientName: "",
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        phoneNumber: "",
        isDefault: false
      });
      setShowAddressForm(false);
      setEditingAddress(null);
      
      showNotification(`Address ${editingAddress ? 'updated' : 'added'} successfully!`);
    } catch (error: any) {
      console.error("Error saving address:", error);
      showNotification(`Failed to save address: ${error.message || error}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAddress = (address: any) => {
    setAddressData({
      label: address.label || "",
      recipientName: address.recipientName || "",
      street: address.address || "",
      city: address.city || "",
      state: address.state || "",
      postalCode: address.postalCode || "",
      country: address.country || "",
      phoneNumber: address.phoneNumber || "",
      isDefault: address.isDefault || false
    });
    setEditingAddress(address._id);
    setShowAddressForm(true);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    
    setIsLoading(true);
    try {
      await deleteCustomerAddress({ addressId });
      showNotification('Address deleted successfully!');
    } catch (error: any) {
      console.error("Error deleting address:", error);
      showNotification(`Failed to delete address: ${error.message || error}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center gap-2 mb-2">
          <SettingsIcon className="w-6 h-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
        <p className="text-gray-600">Manage your shipping preferences and account settings</p>
      </div>

      <div className="px-4 sm:px-0 space-y-6">
        {/* Shipping Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Shipping Preferences
            </CardTitle>
            <CardDescription>
              Configure your default shipping and package handling preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="shipping-speed">Default Shipping Speed</Label>
                  <select
                    id="shipping-speed"
                    value={settings.defaultShippingSpeed}
                    onChange={(e) => handleSettingChange('defaultShippingSpeed', e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="economy">Economy (7-14 days)</option>
                    <option value="standard">Standard (3-7 days)</option>
                    <option value="express">Express (1-3 days)</option>
                    <option value="overnight">Overnight</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Consolidate Packages</Label>
                    <p className="text-sm text-gray-600">Combine multiple packages to save on shipping</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.consolidatePackages}
                    onChange={(e) => handleSettingChange('consolidatePackages', e.target.checked)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Auto-Request Shipping</Label>
                    <p className="text-sm text-gray-600">Automatically request shipping when packages arrive</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoRequestShipping}
                    onChange={(e) => handleSettingChange('autoRequestShipping', e.target.checked)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                    <h4 className="font-medium text-blue-900">Pro Tip</h4>
                  </div>
                  <p className="text-sm text-blue-800">
                    Enable package consolidation to save up to 40% on international shipping costs when you have multiple orders.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Address Book
            </CardTitle>
            <CardDescription>
              Manage your shipping addresses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing addresses */}
            {customerAddresses?.map((address, index) => (
              <div key={address._id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{address.label}</h4>
                      {address.isDefault && (
                        <Badge variant="default" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {address.recipientName && <><strong>{address.recipientName}</strong><br /></>}
                      {address.address}<br />
                      {address.city}{address.state && `, ${address.state}`}, {address.postalCode}<br />
                      {address.country}
                      {address.phoneNumber && <><br />Phone: {address.phoneNumber}</>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditAddress(address)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {!address.isDefault && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteAddress(address._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add/Edit Address Form */}
            {showAddressForm && (
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium mb-4">
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="label">Address Label *</Label>
                      <Input
                        id="label"
                        value={addressData.label}
                        onChange={(e) => handleAddressChange('label', e.target.value)}
                        placeholder="Home, Office, etc."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="recipientName">Recipient Name *</Label>
                      <Input
                        id="recipientName"
                        value={addressData.recipientName}
                        onChange={(e) => handleAddressChange('recipientName', e.target.value)}
                        placeholder="Full name"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Toggle between Google and manual input */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-foreground">Address Input Method</h4>
                      <p className="text-sm text-muted-foreground">Choose how you'd like to enter your address</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUseGoogleAutocomplete(true)}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          useGoogleAutocomplete 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <PenTool className="w-3 h-3 mr-1" />
                        Manual Entry
                      </button>
                    </div>
                  </div>

                  {useGoogleAutocomplete ? (
                    // Google Places Autocomplete
                    <AddressAutocomplete
                      label="Street Address"
                      placeholder="Start typing your address (e.g., 123 Main Street)"
                      value={addressData.street}
                      onChange={(value) => handleAddressChange('street', value)}
                      onAddressSelect={handleGoogleAddressSelect}
                      countryBias={addressData.country && addressData.country !== '' ? addressData.country : undefined}
                      required
                      error={addressValidation?.errors.some(e => e.includes('address') || e.includes('Street')) || false}
                    />
                  ) : (
                    // Manual address input
                    <div>
                      <Label htmlFor="street">Street Address *</Label>
                      <Input
                        id="street"
                        value={addressData.street}
                        onChange={(e) => handleAddressChange('street', e.target.value)}
                        placeholder="123 Main Street, Apt 4B"
                        className="mt-1"
                      />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={addressData.city}
                        onChange={(e) => handleAddressChange('city', e.target.value)}
                        placeholder="City"
                        className={`mt-1 ${addressValidation?.errors.some(e => e.includes('city') || e.includes('City')) ? 'border-red-500' : ''}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <select
                        id="country"
                        value={addressData.country}
                        onChange={(e) => handleAddressChange('country', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Select Country</option>
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="state">
                        State/Region{states.length > 0 ? ' *' : ''}
                      </Label>
                      {states.length > 0 ? (
                        <select
                          id="state"
                          value={addressData.state}
                          onChange={(e) => handleAddressChange('state', e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">Select State/Province</option>
                          {states.map((state) => (
                            <option key={state.code} value={state.code}>
                              {state.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id="state"
                          placeholder="State/Region"
                          value={addressData.state}
                          onChange={(e) => handleAddressChange('state', e.target.value)}
                          className="mt-1"
                        />
                      )}
                    </div>
                    <div>
                      <Label htmlFor="postalCode">Postal Code *</Label>
                      <Input
                        id="postalCode"
                        value={addressData.postalCode}
                        onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                        placeholder="Postal Code"
                        className={`mt-1 ${addressValidation?.errors.some(e => e.includes('postal')) ? 'border-red-500' : ''}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={addressData.phoneNumber}
                        onChange={(e) => handleAddressChange('phoneNumber', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Set as Default Address</Label>
                      <p className="text-sm text-gray-600">Use this address as your primary shipping address</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={addressData.isDefault}
                      onChange={(e) => handleAddressChange('isDefault', e.target.checked)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button onClick={handleSaveAddress} disabled={isLoading}>
                      {isLoading ? "Saving..." : (editingAddress ? "Update Address" : "Add Address")}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowAddressForm(false);
                        setEditingAddress(null);
                        setAddressData({
                          label: "",
                          recipientName: "",
                          street: "",
                          city: "",
                          state: "",
                          postalCode: "",
                          country: "",
                          phoneNumber: "",
                          isDefault: false
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {!showAddressForm && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowAddressForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Address
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Quick Link to Account Settings for Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Configure your notification settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-blue-900">Notification Settings</h4>
              </div>
              <p className="text-sm text-blue-800 mb-3">
                Manage your email, SMS, and push notification preferences in your Account Settings.
              </p>
              <Button onClick={() => window.location.href = '/customer/account'} className="bg-blue-600 hover:bg-blue-700">
                Configure Notifications in Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Display & Localization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Display & Localization
            </CardTitle>
            <CardDescription>
              Customize how information is displayed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={settings.currency}
                  onChange={(e) => handleSettingChange('currency', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="SGD">SGD - Singapore Dollar</option>
                  <option value="MYR">MYR - Malaysian Ringgit</option>
                  <option value="THB">THB - Thai Baht</option>
                  <option value="IDR">IDR - Indonesian Rupiah</option>
                  <option value="PHP">PHP - Philippine Peso</option>
                  <option value="VND">VND - Vietnamese Dong</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="CNY">CNY - Chinese Yuan</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="KRW">KRW - South Korean Won</option>
                  <option value="HKD">HKD - Hong Kong Dollar</option>
                  <option value="TWD">TWD - Taiwan Dollar</option>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="CHF">CHF - Swiss Franc</option>
                  <option value="SEK">SEK - Swedish Krona</option>
                  <option value="NOK">NOK - Norwegian Krone</option>
                  <option value="DKK">DKK - Danish Krone</option>
                  <option value="NZD">NZD - New Zealand Dollar</option>
                  <option value="ZAR">ZAR - South African Rand</option>
                  <option value="BRL">BRL - Brazilian Real</option>
                  <option value="MXN">MXN - Mexican Peso</option>
                </select>
              </div>

              <div>
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                  <option value="ms">Bahasa Melayu</option>
                  <option value="th">ไทย</option>
                </select>
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={settings.timezone}
                  onChange={(e) => handleSettingChange('timezone', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Asia/Singapore">Singapore (GMT+8)</option>
                  <option value="Asia/Kuala_Lumpur">Malaysia (GMT+8)</option>
                  <option value="Asia/Bangkok">Thailand (GMT+7)</option>
                  <option value="Asia/Jakarta">Indonesia (GMT+7)</option>
                  <option value="America/New_York">Eastern Time (GMT-5)</option>
                  <option value="America/Los_Angeles">Pacific Time (GMT-8)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Link to Account Settings for Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Manage your privacy and security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-blue-900">Security Settings</h4>
              </div>
              <p className="text-sm text-blue-800 mb-3">
                Manage your password, privacy settings, two-factor authentication, and data download options in Account Settings.
              </p>
              <Button onClick={() => window.location.href = '/customer/account'} className="bg-blue-600 hover:bg-blue-700">
                Manage Security in Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end space-x-4">
          <Button variant="outline">Reset to Defaults</Button>
          <Button onClick={handleSaveSettings} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save All Settings"}
          </Button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`p-4 rounded-lg shadow-lg max-w-sm ${
            notification.type === 'error' 
              ? 'bg-red-50 border border-red-200 text-red-800' 
              : 'bg-green-50 border border-green-200 text-green-800'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'error' ? (
                <X className="w-5 h-5 text-red-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}