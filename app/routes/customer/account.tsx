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
              <h4 className="font-medium text-blue-900 mb-2">📍 Address Book</h4>
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
              <h4 className="font-medium text-yellow-900 mb-2">🔒 Security Recommendation</h4>
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