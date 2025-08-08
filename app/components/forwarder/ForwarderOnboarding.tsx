"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { CheckCircle, Building, MapPin, Phone, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "../../../convex/_generated/api";

interface FormData {
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  timezone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  warehouseName: string;
  maxParcels: number;
  maxWeightKg: number;
}

const STEPS = [
  {
    id: 1,
    title: "Business Information",
    description: "Tell us about your forwarding business",
    icon: Building
  },
  {
    id: 2,
    title: "Contact Details", 
    description: "How customers can reach you",
    icon: Phone
  },
  {
    id: 3,
    title: "Warehouse Setup",
    description: "Configure your main warehouse",
    icon: MapPin
  }
];

interface ForwarderOnboardingProps {
  userId: string;
  onComplete: () => void;
}

export default function ForwarderOnboarding({ userId, onComplete }: ForwarderOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const createForwarder = useMutation(api.forwarders.upsertForwarder);
  const createWarehouse = useMutation(api.warehouses.createWarehouse);

  const [formData, setFormData] = useState<FormData>({
    businessName: "",
    contactEmail: "",
    contactPhone: "",
    timezone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    warehouseName: "",
    maxParcels: 100,
    maxWeightKg: 30
  });
  
  // Auto-detect timezone on component mount and when location changes
  useEffect(() => {
    try {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setFormData(prev => ({ ...prev, timezone: browserTimezone }));
    } catch (error) {
      console.error('Failed to detect browser timezone:', error);
      setFormData(prev => ({ ...prev, timezone: 'UTC' }));
    }
  }, []);
  
  // Update timezone when location changes
  useEffect(() => {
    if (formData.country) {
      import('../../../convex/utils/locationTimezone').then(({ getTimezoneWithFallback }) => {
        const locationBasedTimezone = getTimezoneWithFallback(
          formData.country,
          formData.state,
          formData.city,
          formData.timezone // current browser timezone as fallback
        );
        
        if (locationBasedTimezone !== formData.timezone) {
          setFormData(prev => ({ ...prev, timezone: locationBasedTimezone }));
          console.log(`Timezone updated based on location: ${formData.country}/${formData.state} -> ${locationBasedTimezone}`);
        }
      }).catch(error => {
        console.error('Failed to load location timezone utilities:', error);
      });
    }
  }, [formData.country, formData.state, formData.city]);

  const updateFormData = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.businessName.trim() !== "";
      case 2:
        return formData.contactEmail.trim() !== "";
      case 3:
        return formData.address.trim() !== "" && formData.city.trim() !== "";
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      return;
    }
    
    setLoading(true);
    try {
      // Create forwarder profile
      const forwarderId = await createForwarder({
        userId: userId,
        businessName: formData.businessName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone || undefined,
        timezone: formData.timezone || 'UTC',
      });

      // Create initial warehouse
      await createWarehouse({
        forwarderId: forwarderId as string,
        name: formData.warehouseName || `${formData.businessName} Main Warehouse`,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postalCode: formData.postalCode,
        maxParcels: formData.maxParcels,
        maxWeightKg: formData.maxWeightKg,
        maxDimensionsCm: "100 x 100 x 100", // Default dimensions
      });

      onComplete();
    } catch (error) {
      console.error("Error creating forwarder profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const isStepComplete = (step: number) => step < currentStep;
  const isCurrentStep = (step: number) => step === currentStep;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all duration-200 ${
                    isStepComplete(step.id) 
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : isCurrentStep(step.id)
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {isStepComplete(step.id) ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-medium ${
                      isCurrentStep(step.id) ? 'text-primary' : 
                      isStepComplete(step.id) ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6 bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Content */}
        <Card className="border-border shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-foreground">
              {(() => {
                const Icon = STEPS[currentStep - 1].icon;
                return <Icon className="h-5 w-5 text-primary" />;
              })()}
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {STEPS[currentStep - 1].description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Step 1: Business Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="e.g. Singapore Logistics Hub"
                    value={formData.businessName}
                    onChange={(e) => updateFormData('businessName', e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">What you'll get:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Professional dashboard to manage orders</li>
                    <li>• Automated label printing system</li>
                    <li>• Real-time order tracking</li>
                    <li>• Customer communication tools</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 2: Contact Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="contactEmail">Business Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="contact@yourlogistics.com"
                    value={formData.contactEmail}
                    onChange={(e) => updateFormData('contactEmail', e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactPhone">Phone Number</Label>
                  <Input
                    id="contactPhone"
                    placeholder="+65 1234 5678"
                    value={formData.contactPhone}
                    onChange={(e) => updateFormData('contactPhone', e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">Optional - for customer support</p>
                </div>
              </div>
            )}

            {/* Step 3: Warehouse Setup */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="warehouseName">Warehouse Name</Label>
                  <Input
                    id="warehouseName"
                    placeholder="Main Warehouse (optional)"
                    value={formData.warehouseName}
                    onChange={(e) => updateFormData('warehouseName', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      placeholder="123 Warehouse Street"
                      value={formData.address}
                      onChange={(e) => updateFormData('address', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="Singapore"
                      value={formData.city}
                      onChange={(e) => updateFormData('city', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="state">State/Region</Label>
                    <Input
                      id="state"
                      placeholder="Central"
                      value={formData.state}
                      onChange={(e) => updateFormData('state', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      placeholder="Singapore"
                      value={formData.country}
                      onChange={(e) => updateFormData('country', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      placeholder="123456"
                      value={formData.postalCode}
                      onChange={(e) => updateFormData('postalCode', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxParcels">Max Parcels Capacity</Label>
                    <Input
                      id="maxParcels"
                      type="number"
                      value={formData.maxParcels}
                      onChange={(e) => updateFormData('maxParcels', parseInt(e.target.value) || 0)}
                      className="mt-1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">Total packages you can handle</p>
                  </div>
                  <div>
                    <Label htmlFor="maxWeightKg">Max Weight per Package (kg)</Label>
                    <Input
                      id="maxWeightKg"
                      type="number"
                      value={formData.maxWeightKg}
                      onChange={(e) => updateFormData('maxWeightKg', parseInt(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              {currentStep === 3 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!validateStep(currentStep) || loading}
                  className="flex items-center gap-2 shadow-sm"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                      Setting up...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle className="h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  disabled={!validateStep(currentStep)}
                  className="flex items-center gap-2 shadow-sm"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skip Option */}
        <div className="text-center mt-6">
          <button
            onClick={onComplete}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now - I'll set this up later
          </button>
        </div>
      </div>
    </div>
  );
}