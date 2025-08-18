import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "react-router";
import type { Route } from "./+types/customer";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useNavigate } from "react-router";
import { useState } from "react";
import * as React from "react";
import { useUser } from "@clerk/react-router";
import { CheckCircle, Package, MapPin, Phone, ArrowRight, ArrowLeft, AlertCircle, Info, Search, PenTool } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { validateFullAddress, getAllCountries, getStatesForCountry, type AddressValidationResult } from "~/utils/addressValidation";
import AddressAutocomplete from "~/components/ui/AddressAutocomplete";

interface FormData {
  fullName: string;
  phoneNumber: string;
  countryCode: string;
  shippingAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  preferredCurrency: string;
}

const STEPS = [
  {
    id: 1,
    title: "Personal Information",
    description: "Tell us about yourself",
    icon: Package
  },
  {
    id: 2,
    title: "Contact Details", 
    description: "How we can reach you",
    icon: Phone
  },
  {
    id: 3,
    title: "Shipping Address",
    description: "Where you'd like packages delivered",
    icon: MapPin
  }
];

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    return redirect("/sign-in");
  }

  try {
    // Check if user already exists
    const existingUser = await fetchQuery(api.users.findUserByToken, { tokenIdentifier: userId });
    
    if (existingUser) {
      // User already exists, redirect to their dashboard
      return redirect(`/${existingUser.role}`);
    }
  } catch (error) {
    console.error("Error checking existing user:", error);
  }

  return { userId };
}

export default function CustomerOnboardingPage({ loaderData }: Route.ComponentProps) {
  const { user } = useUser();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const createUser = useMutation(api.users.createUser);

  const [formData, setFormData] = useState<FormData>({
    fullName: user?.fullName || user?.firstName || "",
    phoneNumber: "",
    countryCode: "+65",
    shippingAddress: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    preferredCurrency: "USD"
  });

  const [addressValidation, setAddressValidation] = useState<AddressValidationResult | null>(null);
  const [countries] = useState(() => getAllCountries());
  const [states, setStates] = useState<Array<{ code: string; name: string }>>([]);
  const [useGoogleAutocomplete, setUseGoogleAutocomplete] = useState(true);

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle Google Places address selection
  const handleGoogleAddressSelect = (addressData: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  }) => {
    setFormData(prev => ({
      ...prev,
      shippingAddress: addressData.address,
      city: addressData.city,
      state: addressData.state,
      country: addressData.country,
      postalCode: addressData.postalCode,
    }));
  };

  // Update states when country changes
  React.useEffect(() => {
    if (formData.country) {
      const countryStates = getStatesForCountry(formData.country);
      setStates(countryStates);
      // Clear state if new country doesn't have states or current state is invalid
      if (countryStates.length === 0 || !countryStates.some(s => s.code === formData.state)) {
        setFormData(prev => ({ ...prev, state: "" }));
      }
    }
  }, [formData.country]);

  // Validate address when relevant fields change
  React.useEffect(() => {
    if (formData.shippingAddress || formData.city || formData.postalCode || formData.country) {
      const validation = validateFullAddress({
        countryA2: formData.country,
        state: formData.state,
        city: formData.city,
        line1: formData.shippingAddress,
        postal: formData.postalCode
      });
      setAddressValidation(validation);
    } else {
      setAddressValidation(null);
    }
  }, [formData.shippingAddress, formData.city, formData.state, formData.country, formData.postalCode]);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.fullName.trim() !== "";
      case 2:
        return formData.phoneNumber.trim() !== "";
      case 3:
        // Require valid address for step 3
        return addressValidation?.isValid === true;
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
    console.log("FORM SUBMIT CLICKED!");
    
    if (!user) {
      alert("Not logged in!");
      return;
    }
    
    setLoading(true);
    try {
      const result = await createUser({
        name: formData.fullName,
        email: user.emailAddresses[0]?.emailAddress || "",
        role: "customer",
      });
      
      console.log("SUCCESS:", result);
      alert("SUCCESS! User created. Going to customer dashboard.");
      
      // Wait a bit longer for database consistency
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Use navigate instead of window.location.replace to trigger proper loading
      navigate("/customer");
      
    } catch (error) {
      console.error("ERROR:", error);
      alert("ERROR: " + error);
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
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="e.g. John Doe"
                    value={formData.fullName}
                    onChange={(e) => updateFormData('fullName', e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">What you'll get:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Track all your international orders in one place</li>
                    <li>• Get real-time shipping notifications</li>
                    <li>• Access to consolidated shipping rates</li>
                    <li>• Manage packages from multiple merchants</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 2: Contact Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <div className="flex gap-2 mt-1">
                    <select
                      value={formData.countryCode}
                      onChange={(e) => updateFormData('countryCode', e.target.value)}
                      className="px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-24"
                    >
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+61">🇦🇺 +61</option>
                      <option value="+1">🇨🇦 +1</option>
                      <option value="+65">🇸🇬 +65</option>
                      <option value="+60">🇲🇾 +60</option>
                      <option value="+66">🇹🇭 +66</option>
                      <option value="+62">🇮🇩 +62</option>
                      <option value="+63">🇵🇭 +63</option>
                      <option value="+84">🇻🇳 +84</option>
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+86">🇨🇳 +86</option>
                      <option value="+81">🇯🇵 +81</option>
                      <option value="+82">🇰🇷 +82</option>
                      <option value="+852">🇭🇰 +852</option>
                      <option value="+886">🇹🇼 +886</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+39">🇮🇹 +39</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+31">🇳🇱 +31</option>
                      <option value="+41">🇨🇭 +41</option>
                      <option value="+46">🇸🇪 +46</option>
                      <option value="+47">🇳🇴 +47</option>
                      <option value="+45">🇩🇰 +45</option>
                      <option value="+64">🇳🇿 +64</option>
                      <option value="+27">🇿🇦 +27</option>
                      <option value="+55">🇧🇷 +55</option>
                      <option value="+52">🇲🇽 +52</option>
                      <option value="+54">🇦🇷 +54</option>
                      <option value="+56">🇨🇱 +56</option>
                    </select>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="1234 5678"
                      value={formData.phoneNumber}
                      onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">For delivery updates and support</p>
                </div>
                
                <div>
                  <Label htmlFor="preferredCurrency">Preferred Currency</Label>
                  <select
                    id="preferredCurrency"
                    value={formData.preferredCurrency}
                    onChange={(e) => updateFormData('preferredCurrency', e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
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
              </div>
            )}

            {/* Step 3: Shipping Address */}
            {currentStep === 3 && (
              <div className="space-y-4">
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
                    label="Shipping Address"
                    placeholder="Start typing your address (e.g., 123 Main Street)"
                    value={formData.shippingAddress}
                    onChange={(value) => updateFormData('shippingAddress', value)}
                    onAddressSelect={handleGoogleAddressSelect}
                    countryBias={formData.country && formData.country !== '' ? formData.country : undefined}
                    required
                    error={addressValidation?.errors.some(e => e.includes('address') || e.includes('Street')) || false}
                  />
                ) : (
                  // Manual address input
                  <div>
                    <Label htmlFor="shippingAddress">Shipping Address *</Label>
                    <Input
                      id="shippingAddress"
                      placeholder="123 Main Street, Apt 4B"
                      value={formData.shippingAddress}
                      onChange={(e) => updateFormData('shippingAddress', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <Label htmlFor="state">
                      State/Region{states.length > 0 ? ' *' : ''}
                    </Label>
                    {states.length > 0 ? (
                      <select
                        id="state"
                        value={formData.state}
                        onChange={(e) => updateFormData('state', e.target.value)}
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
                        value={formData.state}
                        onChange={(e) => updateFormData('state', e.target.value)}
                        className="mt-1"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <select
                      id="country"
                      value={formData.country}
                      onChange={(e) => updateFormData('country', e.target.value)}
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
                  <div>
                    <Label htmlFor="postalCode">Postal Code *</Label>
                    <Input
                      id="postalCode"
                      placeholder={formData.country === 'SG' ? '123456' : 'Postal Code'}
                      value={formData.postalCode}
                      onChange={(e) => updateFormData('postalCode', e.target.value)}
                      className={`mt-1 ${addressValidation?.errors.some(e => e.includes('postal')) ? 'border-red-500' : ''}`}
                    />
                  </div>
                </div>

                {/* Address Validation Feedback */}
                {addressValidation && (
                  <div className="space-y-2">
                    {addressValidation.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-800">Address Issues:</p>
                            <ul className="text-sm text-red-700 mt-1 space-y-1">
                              {addressValidation.errors.map((error, index) => (
                                <li key={index}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {addressValidation.warnings && addressValidation.warnings.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">Suggestions:</p>
                            <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                              {addressValidation.warnings.map((warning, index) => (
                                <li key={index}>• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {addressValidation.suggestions && addressValidation.suggestions.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">Format Help:</p>
                            <ul className="text-sm text-blue-700 mt-1 space-y-1">
                              {addressValidation.suggestions.map((suggestion, index) => (
                                <li key={index}>• {suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">Ready to start shipping?</h4>
                  <p className="text-sm text-muted-foreground">
                    Once setup is complete, you'll be able to track packages, manage orders, and get the best shipping rates for your location.
                  </p>
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
                  disabled={loading}
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
            onClick={handleSubmit}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now - I'll set this up later
          </button>
        </div>
      </div>
    </div>
  );
}