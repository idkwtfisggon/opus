import { getServerAuth } from "~/contexts/auth";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "react-router";
import type { Route } from "./+types/account";
import { useAuth } from "~/contexts/auth";
import { useState } from "react";
import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import { UserCircle, Mail, Key, Shield, Bell, Trash2, Download, Eye, EyeOff, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getServerAuth(args.request);
  
  if (!userId) {
    return redirect("/sign-in");
  }

  try {
    // Get forwarder profile
    const forwarder = await fetchQuery(api.forwarders.getForwarderByUserId, { userId });
    
    return {
      forwarder,
      userId
    };
  } catch (error) {
    console.error("Error loading account data:", error);
    return { 
      forwarder: null,
      userId
    };
  }
}

export default function ForwarderAccountSettings({ loaderData }: Route.ComponentProps) {
  const { user } = useAuth();
  const { forwarder } = loaderData;
  
  // Real-time user data
  const userProfile = useQuery(api.users.getUserProfile);
  
  console.log("Current user profile:", userProfile);
  console.log("Clerk user:", user);
  
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };
  
  // Mutations
  const updateProfile = useMutation(api.users.updateUserProfile);
  const updateNotifications = useMutation(api.users.updateNotificationSettings);
  const updatePrivacySettings = useMutation(api.users.updatePrivacySettings);
  const verifyPhoneNumber = useMutation(api.users.verifyPhoneNumber);
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 2FA Modal States
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState('choice'); // 'choice', 'setup', 'verify', 'disable'
  const [qrCodeData, setQrCodeData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  
  // Notification State
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    country: "",
    timezone: "",
    language: "en",
    bio: "",
    company: "",
    jobTitle: "",
    website: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    orderStatusUpdates: true,
    marketingEmails: false,
    securityAlerts: true
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "private",
    allowMarketing: false,
    dataProcessingConsent: true
  });

  // Update form data when userProfile loads
  React.useEffect(() => {
    if (userProfile || user) {
      setFormData({
        firstName: userProfile?.firstName || user?.firstName || "",
        lastName: userProfile?.lastName || user?.lastName || "",
        email: userProfile?.email || user?.emailAddresses?.[0]?.emailAddress || "",
        phoneNumber: userProfile?.phoneNumber || user?.phoneNumbers?.[0]?.phoneNumber || "",
        country: userProfile?.country || "",
        timezone: userProfile?.timezone || "",
        language: userProfile?.language || "en",
        bio: userProfile?.bio || "",
        company: userProfile?.company || "",
        jobTitle: userProfile?.jobTitle || "",
        website: userProfile?.website || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      
      setNotificationSettings({
        emailNotifications: userProfile?.notificationSettings?.emailNotifications ?? true,
        orderStatusUpdates: userProfile?.notificationSettings?.orderStatusUpdates ?? true,
        marketingEmails: userProfile?.notificationSettings?.marketingEmails ?? false,
        securityAlerts: userProfile?.notificationSettings?.securityAlerts ?? true
      });

      setPrivacySettings({
        profileVisibility: userProfile?.profileVisibility || "private",
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
      console.log("Attempting to update profile with:", {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      });
      
      const result = await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        country: formData.country,
        timezone: formData.timezone,
        language: formData.language,
        bio: formData.bio,
        company: formData.company,
        jobTitle: formData.jobTitle,
        website: formData.website,
      });
      
      console.log("Profile update result:", result);
      showNotification("Profile updated successfully!");
    } catch (error) {
      console.error("Full error object:", error);
      console.error("Error message:", error.message || error);
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
    } catch (error) {
      console.error("Error updating notifications:", error);
      showNotification("Failed to update notification preferences. Please try again.", 'error');
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
      // First verify current password
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
      
      // Handle verification required error
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
    } catch (error) {
      console.error("Error updating privacy settings:", error);
      showNotification(`Failed to update privacy settings: ${error.message || error}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FAToggle = async () => {
    if (!user) return;
    
    if (user.twoFactorEnabled) {
      setTwoFAStep('disable');
    } else {
      setTwoFAStep('choice');
    }
    setShow2FAModal(true);
  };

  const handleSetup2FA = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const resource = await user.createTOTP();
      setQrCodeData(resource);
      setTwoFAStep('verify');
    } catch (error) {
      console.error("Error creating 2FA:", error);
      showNotification(`Failed to setup 2FA: ${error.errors?.[0]?.message || error.message || error}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!qrCodeData || !verificationCode) return;
    
    setIsLoading(true);
    try {
      await qrCodeData.verify({ code: verificationCode });
      setShow2FAModal(false);
      setVerificationCode('');
      setQrCodeData(null);
      showNotification('Two-factor authentication has been enabled successfully!');
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      showNotification(`Invalid code. Please try again.`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await user.disableTOTP();
      setShow2FAModal(false);
      showNotification('Two-factor authentication has been disabled.');
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      showNotification(`Failed to disable 2FA: ${error.errors?.[0]?.message || error.message || error}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Account Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account information and preferences</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Forwarder Account
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
              Update your personal information and display preferences
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="Company Name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  placeholder="Your Job Title"
                  className="mt-1"
                />
              </div>
            </div>

            {forwarder && (
              <div>
                <Label>Business Information</Label>
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{forwarder.businessName}</p>
                  <p className="text-sm text-muted-foreground">{forwarder.contactEmail}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Business details can be updated in Settings
                  </p>
                </div>
              </div>
            )}

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
                <Badge variant="default">Forwarder</Badge>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Verification</span>
                <Badge variant="outline" className="text-green-600">Verified</Badge>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">2FA Status</span>
                <Badge variant={user?.twoFactorEnabled ? "default" : "secondary"}>
                  {user?.twoFactorEnabled ? "Enabled" : "Not Enabled"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Member Since</span>
                <span className="text-sm text-muted-foreground">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>

            <Separator />
            
            <Button 
              size="sm" 
              className="w-full" 
              onClick={handle2FAToggle}
              disabled={isLoading}
              variant={user?.twoFactorEnabled ? "destructive" : "default"}
            >
              {isLoading 
                ? "Processing..." 
                : user?.twoFactorEnabled 
                  ? "Disable 2FA" 
                  : "Enable 2FA"
              }
            </Button>
          </CardContent>
        </Card>
      </div>

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
            <Button variant="outline">Generate Strong Password</Button>
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

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Data & Privacy
          </CardTitle>
          <CardDescription>
            Manage your data and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download Data
            </Button>
            <Button variant="outline">
              Privacy Settings
            </Button>
            <Button variant="outline">
              Data Usage Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-destructive/20 rounded-lg">
              <h4 className="font-semibold text-destructive mb-2">Delete Account</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete your forwarder account and all associated data. This action cannot be undone.
              </p>
              <Button variant="destructive" size="sm">
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2FA Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">
                {twoFAStep === 'disable' ? 'Disable 2FA' : 
                 twoFAStep === 'choice' ? 'Enable 2FA' : 
                 twoFAStep === 'verify' ? 'Verify Setup' : 'Setup 2FA'}
              </h3>
              <button
                onClick={() => setShow2FAModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {twoFAStep === 'disable' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                    <Shield className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-800">Security Warning</p>
                      <p className="text-sm text-red-600">Disabling 2FA will make your account less secure.</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to disable two-factor authentication?
                  </p>
                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="destructive" 
                      onClick={handleDisable2FA}
                      disabled={isLoading}
                    >
                      {isLoading ? "Disabling..." : "Yes, Disable 2FA"}
                    </Button>
                    <Button variant="outline" onClick={() => setShow2FAModal(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {twoFAStep === 'choice' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <Shield className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-6">
                      Two-factor authentication adds an extra layer of security to your account.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                      <h4 className="font-medium text-green-800 mb-2">📱 Authenticator App (Recommended)</h4>
                      <p className="text-sm text-green-700 mb-3">
                        Use Google Authenticator, Authy, or Microsoft Authenticator
                      </p>
                      <Button 
                        className="w-full" 
                        onClick={() => setTwoFAStep('setup')}
                      >
                        Setup with App
                      </Button>
                    </div>
                    
                    <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2">📱 SMS</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Receive codes via text message
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full border-blue-300 text-blue-700 hover:bg-blue-100" 
                        onClick={() => setTwoFAStep('sms-setup')}
                      >
                        Setup with SMS
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {twoFAStep === 'setup' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-medium mb-2">Do you have an authenticator app?</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      You'll need one to continue. Popular options include:
                    </p>
                    
                    <div className="text-left space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Google Authenticator (iOS/Android)
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Authy (iOS/Android/Desktop)
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Microsoft Authenticator (iOS/Android)
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      className="flex-1" 
                      onClick={handleSetup2FA}
                      disabled={isLoading}
                    >
                      {isLoading ? "Setting up..." : "I have an app, continue"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setTwoFAStep('choice')}
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}

              {twoFAStep === 'sms-setup' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-medium mb-4">Phone Number Required</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Enter your phone number to receive SMS codes for two-factor authentication.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="sms-phone">Phone Number</Label>
                      <Input
                        id="sms-phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Include country code (e.g., +1 for US)
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button 
                        className="flex-1" 
                        onClick={async () => {
                          if (!formData.phoneNumber) {
                            showNotification("Please enter a phone number", 'error');
                            return;
                          }
                          setIsLoading(true);
                          try {
                            await verifyPhoneNumber({ phoneNumber: formData.phoneNumber });
                            showNotification("SMS 2FA enabled successfully! (Demo - no actual SMS sent)");
                            setShow2FAModal(false);
                          } catch (error) {
                            showNotification(`Failed to setup SMS 2FA: ${error.message}`, 'error');
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading || !formData.phoneNumber}
                      >
                        {isLoading ? "Setting up..." : "Enable SMS 2FA"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setTwoFAStep('choice')}
                      >
                        Back
                      </Button>
                    </div>
                    
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        <strong>Demo Mode:</strong> SMS functionality requires Twilio/SMS service integration. 
                        This will save your phone number but won't send actual SMS codes.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {twoFAStep === 'verify' && qrCodeData && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-medium mb-4">Scan QR Code</h4>
                    <div 
                      className="mx-auto mb-4 p-4 bg-white border rounded-lg inline-block"
                      dangerouslySetInnerHTML={{ __html: qrCodeData.qrCode }}
                    />
                    <div className="text-xs text-gray-500 mb-4">
                      <p className="font-medium mb-1">Manual Entry Key:</p>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
                        {qrCodeData.secret}
                      </code>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="verification-code">Enter 6-digit code from your app</Label>
                      <Input
                        id="verification-code"
                        type="text"
                        maxLength="6"
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        className="text-center text-lg tracking-widest mt-1"
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <Button 
                        className="flex-1" 
                        onClick={handleVerify2FA}
                        disabled={isLoading || verificationCode.length !== 6}
                      >
                        {isLoading ? "Verifying..." : "Verify & Enable"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setTwoFAStep('setup')}
                      >
                        Back
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
  );
}