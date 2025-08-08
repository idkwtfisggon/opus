"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "../../../convex/_generated/api";

interface TimezoneSettingsProps {
  forwarderId: string;
  currentTimezone?: string;
  country?: string;
  state?: string;
  city?: string;
}

export default function TimezoneSettings({ 
  forwarderId, 
  currentTimezone, 
  country, 
  state, 
  city 
}: TimezoneSettingsProps) {
  const [detectedTimezone, setDetectedTimezone] = useState<string>("");
  const [locationTimezone, setLocationTimezone] = useState<string>("");
  const [recommendedTimezone, setRecommendedTimezone] = useState<string>("");
  const [loading, setLoading] = useState(false);
  
  const updateForwarder = useMutation(api.forwarders.upsertForwarder);

  useEffect(() => {
    // Detect browser timezone
    try {
      const browserTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setDetectedTimezone(browserTZ);
    } catch (error) {
      console.error('Failed to detect browser timezone:', error);
    }

    // Get location-based timezone
    if (country) {
      import('../../../convex/utils/locationTimezone').then(({ getTimezoneWithFallback, getTimezoneFromLocation }) => {
        const locationTZ = getTimezoneFromLocation(country, state, city);
        const recommendedTZ = getTimezoneWithFallback(country, state, city, detectedTimezone);
        
        setLocationTimezone(locationTZ || "Not found");
        setRecommendedTimezone(recommendedTZ);
      }).catch(error => {
        console.error('Failed to load location timezone utilities:', error);
      });
    }
  }, [country, state, city, detectedTimezone]);

  const updateTimezone = async (newTimezone: string) => {
    if (!newTimezone || newTimezone === currentTimezone) return;
    
    setLoading(true);
    try {
      await updateForwarder({
        userId: "", // Will be ignored in update mode
        businessName: "", // Will be ignored in update mode  
        contactEmail: "", // Will be ignored in update mode
        timezone: newTimezone,
      });
      
      // Convex will automatically update the UI via real-time subscriptions
    } catch (error) {
      console.error('Failed to update timezone:', error);
      alert('Failed to update timezone. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimezone = (timezone: string) => {
    if (!timezone) return "None";
    
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: timezone,
        timeZoneName: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const formatted = formatter.format(now);
      return `${timezone} (${formatted})`;
    } catch {
      return timezone;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timezone Settings</CardTitle>
        <CardDescription>
          Your timezone affects how dates and times are displayed in analytics and reports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div>
            <Label className="text-sm font-medium">Current Timezone</Label>
            <div className="text-sm text-muted-foreground mt-1">
              {formatTimezone(currentTimezone || "Not set")}
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Browser Detected</Label>
            <div className="text-sm text-muted-foreground mt-1">
              {formatTimezone(detectedTimezone)}
            </div>
          </div>
          
          {locationTimezone && locationTimezone !== "Not found" && (
            <div>
              <Label className="text-sm font-medium">
                Location Based ({country}{state ? `, ${state}` : ""})
              </Label>
              <div className="text-sm text-muted-foreground mt-1">
                {formatTimezone(locationTimezone)}
              </div>
            </div>
          )}
          
          {recommendedTimezone && recommendedTimezone !== currentTimezone && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Label className="text-sm font-medium text-blue-900">
                Recommended Timezone
              </Label>
              <div className="text-sm text-blue-700 mt-1 mb-3">
                {formatTimezone(recommendedTimezone)}
              </div>
              <Button
                onClick={() => updateTimezone(recommendedTimezone)}
                disabled={loading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Updating..." : "Use This Timezone"}
              </Button>
            </div>
          )}
          
          {detectedTimezone && detectedTimezone !== currentTimezone && detectedTimezone !== recommendedTimezone && (
            <div className="border border-border rounded-lg p-4">
              <Label className="text-sm font-medium">Use Browser Timezone</Label>
              <div className="text-sm text-muted-foreground mt-1 mb-3">
                Switch to your browser's detected timezone
              </div>
              <Button
                onClick={() => updateTimezone(detectedTimezone)}
                disabled={loading}
                size="sm"
                variant="outline"
              >
                {loading ? "Updating..." : "Use Browser Timezone"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}