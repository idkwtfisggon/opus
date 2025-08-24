import { getServerAuth } from "~/contexts/auth";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "react-router";
import type { Route } from "./+types/account";
import { useAuth } from "~/contexts/auth";
import { useState } from "react";
import * as React from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import { UserCircle, Mail, Key, Shield, Bell, Trash2, Download, Eye, EyeOff, X, MapPin, AlertCircle, Info, MapPin as AddressIcon, CreditCard, Plus, Star, Lock } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import StripeProvider from "~/components/stripe/StripeProvider";
import AddPaymentMethodForm from "~/components/stripe/AddPaymentMethodForm";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getServerAuth(args.request);
  
  if (!userId) {
    return redirect("/sign-in");
  }

  return { userId };
}

export default function CustomerAccountSettings({ loaderData }: Route.ComponentProps) {
  const { user } = useAuth();
  
  // Real-time user data
  const userProfile = useQuery(api.users.getUserProfile);
  
  // Mutations
  const updateProfile = useMutation(api.users.updateUserProfile);
  const updateNotifications = useMutation(api.users.updateNotificationSettings);
  const updatePrivacySettings = useMutation(api.users.updatePrivacySettings);
  const addCustomerAddress = useMutation(api.customerDashboard.addCustomerAddress);
  const updateCustomerAddress = useMutation(api.customerDashboard.updateCustomerAddress);
  
  // Stripe mutations
  const createSetupIntent = useAction(api.stripe.createSetupIntent);
  const setDefaultPaymentMethod = useAction(api.stripe.setDefaultPaymentMethod);
  const deletePaymentMethod = useAction(api.stripe.deletePaymentMethod);
  
  // Get customer addresses and payment methods
  const customerAddresses = useQuery(api.customerDashboard.getCustomerAddresses);
  const getPaymentMethods = useAction(api.stripe.getPaymentMethods);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  
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


  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    orderStatusUpdates: true,
    marketingEmails: false,
    securityAlerts: true,
    smsNotifications: false,
    pushNotifications: true,
    weeklyReports: true
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "private",
    allowMarketing: false,
    dataProcessingConsent: true
  });

  // Payment Methods State
  const [showAddCard, setShowAddCard] = useState(false);
  const [setupIntent, setSetupIntent] = useState<{ clientSecret: string; setupIntentId: string } | null>(null);
  
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };

  // Load payment methods
  React.useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const methods = await getPaymentMethods({});
        setPaymentMethods(methods || []);
      } catch (error) {
        console.error("Failed to load payment methods:", error);
      }
    };
    loadPaymentMethods();
  }, []);

  // Update form data when userProfile loads
  React.useEffect(() => {
    if (userProfile || user) {
      setFormData({
        firstName: userProfile?.firstName || user?.user_metadata?.first_name || "",
        lastName: userProfile?.lastName || user?.user_metadata?.last_name || "",
        email: userProfile?.email || user?.email || "",
        phoneNumber: userProfile?.phoneNumber || user?.phone || "",
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
        smsNotifications: userProfile?.notificationSettings?.smsNotifications ?? false,
        pushNotifications: true, // Browser push notifications
        weeklyReports: userProfile?.notificationSettings?.orderStatusUpdates ?? true
      });

      setPrivacySettings({
        profileVisibility: (userProfile?.profileVisibility as "public" | "private") || "private",
        allowMarketing: userProfile?.allowMarketing ?? false,
        dataProcessingConsent: userProfile?.dataProcessingConsent ?? true
      });
    }
  }, [userProfile, user]);
  

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      await updateNotifications({
        emailNotifications: notificationSettings.emailNotifications,
        orderStatusUpdates: notificationSettings.orderStatusUpdates,
        marketingEmails: notificationSettings.marketingEmails,
        securityAlerts: notificationSettings.securityAlerts,
        smsNotifications: notificationSettings.smsNotifications
      });
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
      // TODO: Implement Supabase password change
      // For now, show message that this needs to be implemented
      showNotification("Password change feature will be implemented with Supabase auth update API", 'error');
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
      
    } catch (error: any) {
      console.error("Error updating password:", error);
      showNotification(`Failed to update password: ${error.message || error}`, 'error');
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

  // Payment Methods Functions
  const getCardBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    const iconClass = "w-8 h-8";
    
    if (brandLower === "visa") return <div className={`${iconClass} bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold`}>VISA</div>;
    if (brandLower === "mastercard") return <div className={`${iconClass} bg-red-600 rounded flex items-center justify-center text-white text-xs font-bold`}>MC</div>;
    if (brandLower === "amex") return <div className={`${iconClass} bg-green-600 rounded flex items-center justify-center text-white text-xs font-bold`}>AMEX</div>;
    if (brandLower === "discover") return <div className={`${iconClass} bg-orange-600 rounded flex items-center justify-center text-white text-xs font-bold`}>DISC</div>;
    return <CreditCard className={`${iconClass} text-gray-500`} />;
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    return numericValue.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const detectCardBrand = (cardNumber: string) => {
    const number = cardNumber.replace(/\D/g, '');
    if (number.startsWith('4')) return 'visa';
    if (number.startsWith('5') || number.startsWith('2')) return 'mastercard';
    if (number.startsWith('3')) return 'amex';
    if (number.startsWith('6')) return 'discover';
    return 'unknown';
  };

  const handleCardInputChange = (field: string, value: string) => {
    if (field === 'cardNumber') {
      const formatted = formatCardNumber(value);
      if (formatted.replace(/\s/g, '').length <= 16) {
        setCardForm(prev => ({ ...prev, [field]: formatted }));
      }
    } else if (field === 'expMonth' || field === 'expYear') {
      const numericValue = value.replace(/\D/g, '');
      if (field === 'expMonth' && numericValue.length <= 2 && parseInt(numericValue) <= 12) {
        setCardForm(prev => ({ ...prev, [field]: numericValue }));
      } else if (field === 'expYear' && numericValue.length <= 4) {
        setCardForm(prev => ({ ...prev, [field]: numericValue }));
      }
    } else if (field === 'cvc') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 4) {
        setCardForm(prev => ({ ...prev, [field]: numericValue }));
      }
    } else {
      setCardForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleAddCard = async () => {
    setIsLoading(true);
    try {
      const result = await createSetupIntent();
      setSetupIntent(result);
      setShowAddCard(true);
    } catch (error: any) {
      showNotification(`Failed to prepare payment method: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentMethodAdded = async () => {
    setShowAddCard(false);
    setSetupIntent(null);
    showNotification("Payment method added successfully!");
    // Refresh payment methods
    try {
      const methods = await getPaymentMethods({});
      setPaymentMethods(methods || []);
    } catch (error) {
      console.error("Failed to refresh payment methods:", error);
    }
  };

  const handleSetDefaultCard = async (cardId: string) => {
    setIsLoading(true);
    try {
      await setDefaultPaymentMethod({ paymentMethodId: cardId });
      showNotification("Default payment method updated!");
      // Refresh payment methods
      const methods = await getPaymentMethods({});
      setPaymentMethods(methods || []);
    } catch (error: any) {
      showNotification(`Failed to update default payment method: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("Are you sure you want to delete this payment method?")) {
      return;
    }

    setIsLoading(true);
    try {
      await deletePaymentMethod({ paymentMethodId: cardId });
      showNotification("Payment method deleted successfully!");
      // Refresh payment methods
      const methods = await getPaymentMethods({});
      setPaymentMethods(methods || []);
    } catch (error: any) {
      showNotification(`Failed to delete payment method: ${error.message}`, 'error');
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
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Address Management - Quick Link to Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Address Management
            </CardTitle>
            <CardDescription>
              Manage your shipping addresses and delivery preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <AddressIcon className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-blue-900">Address Book</h4>
              </div>
              <p className="text-sm text-blue-800 mb-3">
                Your addresses have been moved to Settings for better organization. You can now manage multiple addresses, set defaults, and more.
              </p>
              <Button onClick={() => window.location.href = '/customer/settings'} className="bg-blue-600 hover:bg-blue-700">
                Manage Addresses in Settings
              </Button>
            </div>
            
            {customerAddresses && customerAddresses.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Your Current Addresses:</h4>
                {customerAddresses.slice(0, 2).map((address) => (
                  <div key={address._id} className="p-3 border rounded-lg mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{address.label}</span>
                      {address.isDefault && (
                        <Badge variant="default" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {address.address}, {address.city}, {address.country}
                    </p>
                  </div>
                ))}
                {customerAddresses.length > 2 && (
                  <p className="text-sm text-gray-600">+ {customerAddresses.length - 2} more addresses</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>
              Manage your credit cards and payment preferences for shipping orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Existing Payment Methods */}
            {paymentMethods.length > 0 ? (
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Your Payment Methods</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="p-4 border rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getCardBrandIcon(method.brand)}
                          <div>
                            <p className="font-medium">•••• •••• •••• {method.last4}</p>
                            <p className="text-sm text-muted-foreground">
                              Expires {method.expMonth.toString().padStart(2, '0')}/{method.expYear}
                            </p>
                          </div>
                        </div>
                        {method.isDefault && (
                          <Badge variant="default" className="text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{method.holderName}</p>
                        <div className="flex gap-2">
                          {!method.isDefault && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefaultCard(method.id)}
                              disabled={isLoading}
                              className="text-xs"
                            >
                              Set Default
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCard(method.id)}
                            disabled={isLoading}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg font-medium">No payment methods added</p>
                <p className="text-gray-400">Add a credit card to start placing orders</p>
              </div>
            )}

            {/* Add New Card Section */}
            {!showAddCard ? (
              <div className="pt-4">
                <Button onClick={handleAddCard} disabled={isLoading} className="w-full md:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  {isLoading ? "Preparing..." : "Add New Payment Method"}
                </Button>
              </div>
            ) : setupIntent ? (
              <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">Add New Card</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddCard(false);
                      setSetupIntent(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <StripeProvider clientSecret={setupIntent.clientSecret}>
                  <AddPaymentMethodForm
                    onSuccess={handlePaymentMethodAdded}
                    onCancel={() => {
                      setShowAddCard(false);
                      setSetupIntent(null);
                    }}
                    clientSecret={setupIntent.clientSecret}
                  />
                </StripeProvider>
              </div>
            ) : null}

            {/* Payment Info Notice */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-blue-900">How Payment Works</h4>
              </div>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Add your card once - no need to re-enter details</li>
                <li>• Get charged automatically when you create orders</li>
                <li>• Just like Uber - simple and seamless</li>
                <li>• Secure processing by Stripe with bank-level encryption</li>
                <li>• Update or remove cards anytime</li>
              </ul>
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
                    <p className="text-sm text-muted-foreground">Critical updates via text message</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.smsNotifications}
                    onChange={(e) => handleNotificationChange('smsNotifications', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Browser notifications for real-time updates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.pushNotifications}
                    onChange={(e) => handleNotificationChange('pushNotifications', e.target.checked)}
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
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weekly Reports</p>
                    <p className="text-sm text-muted-foreground">Summary of your shipping activity</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.weeklyReports}
                    onChange={(e) => handleNotificationChange('weeklyReports', e.target.checked)}
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

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Manage your privacy settings and account security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Two-Factor Authentication */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Account Security</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium">Enable Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                  </div>
                </Button>
                
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <p className="font-medium">Manage Login Sessions</p>
                      <p className="text-sm text-muted-foreground">View and revoke active sessions</p>
                    </div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Privacy Preferences</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Profile Visibility</p>
                    <p className="text-sm text-muted-foreground">Control who can see your profile information</p>
                  </div>
                  <select
                    value={privacySettings.profileVisibility}
                    onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                    className="px-3 py-1 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Marketing Communications</p>
                    <p className="text-sm text-muted-foreground">Allow us to send you promotional content</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacySettings.allowMarketing}
                    onChange={(e) => handlePrivacyChange('allowMarketing', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Data Processing Consent</p>
                    <p className="text-sm text-muted-foreground">Allow processing of your data for service improvement</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacySettings.dataProcessingConsent}
                    onChange={(e) => handlePrivacyChange('dataProcessingConsent', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Data Management</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-purple-600" />
                    <div className="text-left">
                      <p className="font-medium">Download My Data</p>
                      <p className="text-sm text-muted-foreground">Export all your account data</p>
                    </div>
                  </div>
                </Button>
                
                <Button variant="outline" className="justify-start h-auto p-4 border-red-200 text-red-700 hover:bg-red-50">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-red-600" />
                    <div className="text-left">
                      <p className="font-medium">Delete Account</p>
                      <p className="text-sm text-red-600">Permanently remove your account</p>
                    </div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-yellow-600" />
                <h4 className="font-medium text-yellow-900">Security Recommendation</h4>
              </div>
              <p className="text-sm text-yellow-800">
                We recommend enabling two-factor authentication to secure your account, especially since you'll be receiving valuable packages. 
                Regular security checkups help keep your account safe.
              </p>
            </div>

            {/* Save Privacy Settings */}
            <div className="flex gap-3 pt-4">
              <Button onClick={handlePrivacySave} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Privacy Settings"}
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