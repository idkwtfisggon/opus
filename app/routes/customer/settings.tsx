import type { Route } from "./+types/settings";
import { Settings as SettingsIcon, Package, MapPin, CreditCard, Bell, Shield, Globe, Palette } from "lucide-react";
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Settings - Customer Portal" },
    { name: "description", content: "Manage your shipping preferences and account settings" },
  ];
}

export default function CustomerSettings() {
  const [settings, setSettings] = useState({
    // Shipping Preferences
    defaultShippingSpeed: "standard",
    consolidatePackages: true,
    autoRequestShipping: false,
    
    // Address Book
    addresses: [
      {
        id: "1",
        label: "Home",
        street: "123 Orchard Road",
        city: "Singapore",
        postalCode: "238857",
        country: "Singapore",
        isDefault: true
      }
    ],
    
    // Notification Preferences
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    weeklyReport: true,
    
    // Display Preferences
    currency: "SGD",
    language: "en",
    timezone: "Asia/Singapore",
    theme: "light"
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // TODO: Save settings to Convex
      console.log("Saving settings:", settings);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("Settings saved successfully!");
    } catch (error) {
      alert("Failed to save settings. Please try again.");
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
                  <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tip</h4>
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
            {settings.addresses.map((address, index) => (
              <div key={address.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{address.label}</h4>
                      {address.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {address.street}<br />
                      {address.city}, {address.postalCode}<br />
                      {address.country}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Edit</Button>
                    {!address.isDefault && (
                      <Button variant="outline" size="sm">Delete</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            <Button variant="outline" className="w-full">
              + Add New Address
            </Button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose how you want to be notified about your orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Email Notifications</Label>
                    <p className="text-sm text-gray-600">Order updates and shipping notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">SMS Notifications</Label>
                    <p className="text-sm text-gray-600">Critical updates via text message</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.smsNotifications}
                    onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Push Notifications</Label>
                    <p className="text-sm text-gray-600">Browser notifications for real-time updates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.pushNotifications}
                    onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Weekly Reports</Label>
                    <p className="text-sm text-gray-600">Summary of your shipping activity</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.weeklyReport}
                    onChange={(e) => handleSettingChange('weeklyReport', e.target.checked)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>
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

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Manage your privacy and security preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="w-4 h-4 mr-2" />
                  Enable Two-Factor Authentication
                </Button>
              </div>
              <div>
                <Button variant="outline" className="w-full justify-start">
                  <Package className="w-4 h-4 mr-2" />
                  Download My Data
                </Button>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-2">🔒 Security Notice</h4>
              <p className="text-sm text-yellow-800">
                We recommend enabling two-factor authentication to secure your account, especially since you'll be receiving valuable packages.
              </p>
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
    </div>
  );
}