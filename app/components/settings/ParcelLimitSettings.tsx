"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "../../../convex/_generated/api";
import { Package, Weight, Info } from "lucide-react";

interface ParcelLimitSettingsProps {
  forwarderId: string;
  currentMaxParcelsPerMonth?: number;
  currentMaxParcelWeight?: number;
  currentMaxDimensions?: string;
  currentProhibitedItems?: string[];
  businessName: string;
}

export default function ParcelLimitSettings({ 
  forwarderId, 
  currentMaxParcelsPerMonth,
  currentMaxParcelWeight,
  currentMaxDimensions,
  currentProhibitedItems,
  businessName
}: ParcelLimitSettingsProps) {
  const [formData, setFormData] = useState({
    maxParcelsPerMonth: currentMaxParcelsPerMonth || 500,
    maxParcelWeight: currentMaxParcelWeight || 30,
    maxDimensions: currentMaxDimensions || '',
    prohibitedItems: currentProhibitedItems || []
  });
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateForwarder = useMutation(api.forwarders.updateParcelLimits);
  const updateRestrictions = useMutation(api.forwarders.updatePackageRestrictions);

  useEffect(() => {
    setFormData({
      maxParcelsPerMonth: currentMaxParcelsPerMonth || 500,
      maxParcelWeight: currentMaxParcelWeight || 30,
      maxDimensions: currentMaxDimensions || '',
      prohibitedItems: currentProhibitedItems || []
    });
  }, [currentMaxParcelsPerMonth, currentMaxParcelWeight, currentMaxDimensions, currentProhibitedItems]);

  useEffect(() => {
    const changed = (
      formData.maxParcelsPerMonth !== (currentMaxParcelsPerMonth || 500) ||
      formData.maxParcelWeight !== (currentMaxParcelWeight || 30) ||
      formData.maxDimensions !== (currentMaxDimensions || '') ||
      JSON.stringify(formData.prohibitedItems) !== JSON.stringify(currentProhibitedItems || [])
    );
    setHasChanges(changed);
  }, [formData, currentMaxParcelsPerMonth, currentMaxParcelWeight, currentMaxDimensions, currentProhibitedItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    setLoading(true);
    try {
      // Update parcel limits
      await updateForwarder({
        forwarderId,
        maxParcelsPerMonth: formData.maxParcelsPerMonth,
        maxParcelWeight: formData.maxParcelWeight,
      });

      // Update package restrictions
      await updateRestrictions({
        forwarderId,
        maxDimensions: formData.maxDimensions || undefined,
        prohibitedItems: formData.prohibitedItems.length > 0 ? formData.prohibitedItems : undefined,
      });

      setHasChanges(false);
      alert('Parcel limits and restrictions updated successfully!');
    } catch (error) {
      console.error('Failed to update settings:', error);
      alert('Failed to update settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      maxParcelsPerMonth: currentMaxParcelsPerMonth || 500,
      maxParcelWeight: currentMaxParcelWeight || 30,
      maxDimensions: currentMaxDimensions || '',
      prohibitedItems: currentProhibitedItems || []
    });
  };

  const getMonthlyQuotaStatus = () => {
    const quota = formData.maxParcelsPerMonth;
    if (quota <= 100) return { color: "text-red-600", level: "Starter" };
    if (quota <= 300) return { color: "text-yellow-600", level: "Standard" };
    if (quota <= 500) return { color: "text-blue-600", level: "Professional" };
    return { color: "text-green-600", level: "Enterprise" };
  };

  const getWeightLimitStatus = () => {
    const weight = formData.maxParcelWeight;
    if (weight <= 10) return { color: "text-yellow-600", level: "Light parcels only" };
    if (weight <= 30) return { color: "text-blue-600", level: "Standard parcels" };
    return { color: "text-green-600", level: "Heavy parcels allowed" };
  };

  const monthlyStatus = getMonthlyQuotaStatus();
  const weightStatus = getWeightLimitStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Parcel Limits & Restrictions
        </CardTitle>
        <CardDescription>
          Configure your monthly parcel capacity, weight limits, and package restrictions. These settings will be visible to customers and affect order acceptance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Monthly Parcel Limit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxParcelsPerMonth" className="text-sm font-medium">
                Monthly Parcel Limit
              </Label>
              <div className="flex items-center gap-1">
                <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${monthlyStatus.color} font-medium`}>
                  {monthlyStatus.level}
                </span>
                <div className="relative group">
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-black text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div className="font-medium mb-1">Service Tiers:</div>
                    <div>• Starter (≤100): Small-scale operations</div>
                    <div>• Standard (≤300): Medium volume forwarders</div>
                    <div>• Professional (≤500): High-capacity services</div>
                    <div>• Enterprise (500+): Large-scale logistics</div>
                  </div>
                </div>
              </div>
            </div>
            <Input
              id="maxParcelsPerMonth"
              type="number"
              min="1"
              max="10000"
              value={formData.maxParcelsPerMonth}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                maxParcelsPerMonth: parseInt(e.target.value) || 0 
              }))}
              className="w-full"
              placeholder="e.g. 500"
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of parcels you can handle per month. This affects your visibility in the customer portal.
            </p>
          </div>

          {/* Weight Limit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxParcelWeight" className="flex items-center gap-2 text-sm font-medium">
                <Weight className="w-4 h-4" />
                Max Parcel Weight (kg)
              </Label>
              <div className="flex items-center gap-1">
                <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${weightStatus.color} font-medium`}>
                  {weightStatus.level}
                </span>
                <div className="relative group">
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-black text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div className="font-medium mb-1">Weight Categories:</div>
                    <div>• Light parcels (≤10kg): Documents, small items</div>
                    <div>• Standard parcels (≤30kg): Most consumer goods</div>
                    <div>• Heavy parcels (30kg+): Large/heavy items</div>
                  </div>
                </div>
              </div>
            </div>
            <Input
              id="maxParcelWeight"
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={formData.maxParcelWeight}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                maxParcelWeight: parseFloat(e.target.value) || 0 
              }))}
              className="w-full"
              placeholder="e.g. 30.0"
            />
            <p className="text-xs text-muted-foreground">
              Maximum weight per individual parcel. Parcels exceeding this limit will be rejected automatically.
            </p>
          </div>

          {/* Package Restrictions */}
          <div className="space-y-4 p-4 border border-border rounded-lg">
            <h4 className="text-base font-medium text-foreground">Package Restrictions</h4>
            
            {/* Maximum Dimensions */}
            <div className="space-y-3">
              <Label htmlFor="maxDimensions" className="text-sm font-medium">
                Maximum Dimensions (L x W x H in cm)
              </Label>
              <Input
                id="maxDimensions"
                type="text"
                value={formData.maxDimensions}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  maxDimensions: e.target.value 
                }))}
                className="w-full"
                placeholder="e.g. 100 x 50 x 30"
              />
              <p className="text-xs text-muted-foreground">
                Maximum package dimensions. Leave empty if no restrictions apply.
              </p>
            </div>

            {/* Prohibited Items */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Prohibited Items</Label>
              <div className="space-y-2">
                {['Batteries', 'Liquids', 'Fragile Electronics', 'Hazardous Materials', 'Perishable Items', 'Weapons', 'Cash/Valuables', 'Documents'].map((item) => (
                  <label key={item} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.prohibitedItems.includes(item)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ 
                            ...prev, 
                            prohibitedItems: [...prev.prohibitedItems, item] 
                          }));
                        } else {
                          setFormData(prev => ({ 
                            ...prev, 
                            prohibitedItems: prev.prohibitedItems.filter(i => i !== item) 
                          }));
                        }
                      }}
                      className="rounded border-border"
                    />
                    <span className="text-sm text-foreground">{item}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select item categories you cannot handle. Customers will see these restrictions.
              </p>
            </div>
          </div>

          {/* Current Status Overview */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-foreground">Current Capacity Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Monthly Capacity:</span>
                <div className="font-medium">{formData.maxParcelsPerMonth.toLocaleString()} parcels/month</div>
                <div className="text-xs text-muted-foreground">≈ {Math.round(formData.maxParcelsPerMonth / 30)} parcels/day</div>
              </div>
              <div>
                <span className="text-muted-foreground">Weight Limit:</span>
                <div className="font-medium">{formData.maxParcelWeight}kg per parcel</div>
                <div className="text-xs text-muted-foreground">Total capacity: {(formData.maxParcelsPerMonth * formData.maxParcelWeight).toLocaleString()}kg/month</div>
              </div>
            </div>
          </div>

          {/* Impact Notice */}
          {hasChanges && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Changes Preview</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Dashboard capacity metrics will update immediately</li>
                <li>• Customer portal will reflect new limits</li>
                <li>• Order acceptance rules will apply these new limits</li>
                <li>• Browser extension will show updated capacity</li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || loading}
            >
              Reset Changes
            </Button>
            <Button
              type="submit"
              disabled={!hasChanges || loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? "Saving..." : "Save Parcel Limits"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}