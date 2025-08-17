import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "react-router";
import type { Route } from "./+types/account";
import { useUser } from "@clerk/react-router";
import { useState } from "react";
import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import { UserCircle, Mail, Key, Shield, Bell, Trash2, Download, Eye, EyeOff, X, MapPin, AlertCircle, Info } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { validateFullAddress, getAllCountries, getStatesForCountry, type AddressValidationResult } from "~/utils/addressValidation";
import AddressAutocomplete from "~/components/ui/AddressAutocomplete";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    return redirect("/sign-in");
  }

  return { userId };
}

export default function CustomerAccountSettings({ loaderData }: Route.ComponentProps) {
  const { user } = useUser();
  
  // Real-time user data
  const userProfile = useQuery(api.users.getUserProfile);
  
  // Mutations
  const updateProfile = useMutation(api.users.updateUserProfile);
  const updateNotifications = useMutation(api.users.updateNotificationSettings);
  const updatePrivacySettings = useMutation(api.users.updatePrivacySettings);
  const addCustomerAddress = useMutation(api.customerDashboard.addCustomerAddress);
  const updateCustomerAddress = useMutation(api.customerDashboard.updateCustomerAddress);
  
  // Get customer addresses
  const customerAddresses = useQuery(api.customerDashboard.getCustomerAddresses);
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Notification State
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    country: "",
    language: "en",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [addressData, setAddressData] = useState({
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: ""
  });

  const [addressValidation, setAddressValidation] = useState<AddressValidationResult | null>(null);
  const [countries] = useState(() => getAllCountries());
  const [states, setStates] = useState<Array<{ code: string; name: string }>>([]);
  const [useGoogleAutocomplete, setUseGoogleAutocomplete] = useState(true);

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    orderStatusUpdates: true,
    marketingEmails: false,
    securityAlerts: true,
    smsNotifications: false
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "private",
    allowMarketing: false,
    dataProcessingConsent: true
  });
  
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };

  // Update form data when userProfile loads
  React.useEffect(() => {
    if (userProfile || user) {
      setFormData({
        firstName: userProfile?.firstName || user?.firstName || "",
        lastName: userProfile?.lastName || user?.lastName || "",
        email: userProfile?.email || user?.emailAddresses?.[0]?.emailAddress || "",
        phoneNumber: userProfile?.phoneNumber || user?.phoneNumbers?.[0]?.phoneNumber || "",
        country: userProfile?.country || "",
        language: userProfile?.language || "en",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      
      setNotificationSettings({
        emailNotifications: userProfile?.notificationSettings?.emailNotifications ?? true,
        orderStatusUpdates: userProfile?.notificationSettings?.orderStatusUpdates ?? true,
        marketingEmails: userProfile?.notificationSettings?.marketingEmails ?? false,
        securityAlerts: userProfile?.notificationSettings?.securityAlerts ?? true,
        smsNotifications: userProfile?.notificationSettings?.smsNotifications ?? false
      });

      setPrivacySettings({
        profileVisibility: (userProfile?.profileVisibility as "public" | "private") || "private",
        allowMarketing: userProfile?.allowMarketing ?? false,
        dataProcessingConsent: userProfile?.dataProcessingConsent ?? true
      });
    }
  }, [userProfile, user]);
  
  // Load default address when addresses are available
  React.useEffect(() => {
    if (customerAddresses && customerAddresses.length > 0) {
      const defaultAddress = customerAddresses.find(addr => addr.isDefault) || customerAddresses[0];
      if (defaultAddress) {
        setAddressData({
          street: defaultAddress.address || "",
          city: defaultAddress.city || "",
          state: defaultAddress.state || "",
          postalCode: defaultAddress.postalCode || "",
          country: defaultAddress.country || ""
        });
      }
    }
  }, [customerAddresses]);
  
  // Update states when country changes
  React.useEffect(() => {
    if (addressData.country) {
      const countryStates = getStatesForCountry(addressData.country);
      setStates(countryStates);
      // Clear state if new country doesn't have states or current state is invalid
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: string, value: string) => {
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
    setAddressData({
      street: addressData.address,
      city: addressData.city,
      state: addressData.state,
      country: addressData.country,
      postalCode: addressData.postalCode,
    });
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }));
  };

  const handlePrivacyChange = (field: string, value: string | boolean) => {
    setPrivacySettings(prev => ({ ...prev, [field]: value }));
  };

  const handleProfileSave = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        country: formData.country,
        language: formData.language,
      });
      
      showNotification("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      showNotification(`Failed to update profile: ${error.message || error}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationsSave = async () => {
    setIsLoading(true);
    try {
      await updateNotifications(notificationSettings);
      showNotification("Notification preferences updated successfully!");
    } catch (error: any) {
      console.error("Error updating notifications:", error);
      showNotification(`Failed to update notification preferences: ${error.message || error}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!formData.currentPassword) {
      showNotification("Please enter your current password.", 'error');
      return;
    }
    
    if (!formData.newPassword || !formData.confirmPassword) {
      showNotification("Please fill in both new password fields.", 'error');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      showNotification("New passwords don't match.", 'error');
      return;
    }
    
    if (formData.newPassword.length < 8) {
      showNotification("Password must be at least 8 characters long.", 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      await user?.updatePassword({
        newPassword: formData.newPassword,
        currentPassword: formData.currentPassword,
      });
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
      
      showNotification("Password updated successfully!");
    } catch (error) {
      console.error("Error updating password:", error);
      
      if (error.message?.includes("additional verification")) {
        showNotification("For security reasons, please sign out and sign back in, then try changing your password again.", 'error');
      } else {
        showNotification(`Failed to update password: ${error.errors?.[0]?.message || error.message || error}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrivacySave = async () => {
    setIsLoading(true);
    try {
      await updatePrivacySettings(privacySettings);
      showNotification("Privacy settings updated successfully!");
    } catch (error: any) {
      console.error("Error updating privacy settings:", error);
      showNotification(`Failed to update privacy settings: ${error.message || error}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSave = async () => {
    // Validate address before saving
    if (!addressValidation?.isValid) {
      showNotification('Please fix address validation errors before saving', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const defaultAddress = customerAddresses?.find(addr => addr.isDefault);
      
      if (defaultAddress) {
        // Update existing default address
        await updateCustomerAddress({
          addressId: defaultAddress._id,
          address: addressData.street,
          city: addressData.city,
          state: addressData.state,
          postalCode: addressData.postalCode,
          country: addressData.country,
        });
      } else {
        // Create new default address
        await addCustomerAddress({
          label: "Default Address",
          recipientName: formData.firstName + " " + formData.lastName,
          address: addressData.street,
          city: addressData.city,
          state: addressData.state,
          country: addressData.country,
          postalCode: addressData.postalCode,
          isDefault: true,
        });
      }
      
      showNotification("Address updated successfully!");
    } catch (error: any) {
      console.error("Error updating address:", error);
      showNotification(`Failed to update address: ${error.message || error}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Account Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your account information and preferences</p>
          </div>
          <Badge variant="outline" className="text-sm">
            Customer Account
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  This is your login email and where you'll receive notifications
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <select
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="SG">Singapore</option>
                    <option value="MY">Malaysia</option>
                    <option value="TH">Thailand</option>
                    <option value="ID">Indonesia</option>
                    <option value="PH">Philippines</option>
                    <option value="VN">Vietnam</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleProfileSave} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>Cancel</Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Account Type</span>
                  <Badge variant="default">Customer</Badge>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Verification</span>
                  <Badge variant="outline" className="text-green-600">Verified</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Member Since</span>
                  <span className="text-sm text-muted-foreground">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Default Shipping Address
            </CardTitle>
            <CardDescription>
              Your default address for package delivery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  🔍 Smart Search
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
                  ✏️ Manual Entry
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
                <Label htmlFor="street">Street Address</Label>
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
                  placeholder="Singapore"
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
            
            <div className="grid grid-cols-2 gap-4">
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
                  placeholder={addressData.country === 'SG' ? '123456' : 'Postal Code'}
                  className={`mt-1 ${addressValidation?.errors.some(e => e.includes('postal')) ? 'border-red-500' : ''}`}
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={handleAddressSave} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Address"}
              </Button>
              <Button variant="outline">Add New Address</Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Update your password and security preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={handlePasswordChange} disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose how and when you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive general updates via email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailNotifications}
                    onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order Status Updates</p>
                    <p className="text-sm text-muted-foreground">Get notified when order statuses change</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.orderStatusUpdates}
                    onChange={(e) => handleNotificationChange('orderStatusUpdates', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive important updates via SMS</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.smsNotifications}
                    onChange={(e) => handleNotificationChange('smsNotifications', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Marketing Emails</p>
                    <p className="text-sm text-muted-foreground">Receive product updates and promotions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.marketingEmails}
                    onChange={(e) => handleNotificationChange('marketingEmails', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Security Alerts</p>
                    <p className="text-sm text-muted-foreground">Important account security notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.securityAlerts}
                    onChange={(e) => handleNotificationChange('securityAlerts', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button onClick={handleNotificationsSave} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Preferences"}
              </Button>
              <Button variant="outline">Reset to Defaults</Button>
            </div>
          </CardContent>
        </Card>

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
                  <Shield className="w-5 h-5 text-green-600" />
                )}
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}