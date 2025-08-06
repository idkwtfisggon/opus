import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import type { Route } from "./+types/settings";
import { api } from "../../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState, useEffect } from "react";
import { countryZoneList, getCountryCodesForZone } from "../../utils/countryZones";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get forwarder profile first
    const forwarder = await fetchQuery(api.forwarders.getForwarderByUserId, { userId });
    
    if (!forwarder) {
      throw new Response("Forwarder profile not found", { status: 404 });
    }

    // Get forwarder settings
    const settings = await fetchQuery(api.forwarderSettings.getForwarderSettings, { 
      forwarderId: forwarder._id 
    });

    return {
      forwarder,
      settings,
    };
  } catch (error) {
    console.error("Error loading settings:", error);
    return { 
      forwarder: null,
      settings: null,
    };
  }
}

// Complete list of countries with codes
const ALL_COUNTRIES = [
  { code: "AD", name: "Andorra" }, { code: "AE", name: "United Arab Emirates" }, { code: "AL", name: "Albania" }, 
  { code: "AM", name: "Armenia" }, { code: "AO", name: "Angola" }, { code: "AR", name: "Argentina" }, 
  { code: "AT", name: "Austria" }, { code: "AU", name: "Australia" }, { code: "AZ", name: "Azerbaijan" }, 
  { code: "BA", name: "Bosnia and Herzegovina" }, { code: "BB", name: "Barbados" }, { code: "BD", name: "Bangladesh" }, 
  { code: "BE", name: "Belgium" }, { code: "BH", name: "Bahrain" }, { code: "BN", name: "Brunei" }, 
  { code: "BO", name: "Bolivia" }, { code: "BR", name: "Brazil" }, { code: "BS", name: "Bahamas" }, 
  { code: "BT", name: "Bhutan" }, { code: "BW", name: "Botswana" }, { code: "BY", name: "Belarus" }, 
  { code: "BZ", name: "Belize" }, { code: "CA", name: "Canada" }, { code: "CH", name: "Switzerland" }, 
  { code: "CI", name: "Côte d'Ivoire" }, { code: "CL", name: "Chile" }, { code: "CM", name: "Cameroon" }, 
  { code: "CN", name: "China" }, { code: "CO", name: "Colombia" }, { code: "CR", name: "Costa Rica" }, 
  { code: "HR", name: "Croatia" }, { code: "CU", name: "Cuba" }, { code: "CY", name: "Cyprus" }, 
  { code: "CZ", name: "Czech Republic" }, { code: "DE", name: "Germany" }, { code: "DK", name: "Denmark" }, 
  { code: "DO", name: "Dominican Republic" }, { code: "DZ", name: "Algeria" }, { code: "EC", name: "Ecuador" }, 
  { code: "EE", name: "Estonia" }, { code: "EG", name: "Egypt" }, { code: "ES", name: "Spain" }, 
  { code: "ET", name: "Ethiopia" }, { code: "FI", name: "Finland" }, { code: "FJ", name: "Fiji" }, 
  { code: "FM", name: "Micronesia" }, { code: "FR", name: "France" }, { code: "GB", name: "United Kingdom" }, 
  { code: "GE", name: "Georgia" }, { code: "GH", name: "Ghana" }, { code: "GR", name: "Greece" }, 
  { code: "GT", name: "Guatemala" }, { code: "HK", name: "Hong Kong" }, { code: "HN", name: "Honduras" }, 
  { code: "HU", name: "Hungary" }, { code: "ID", name: "Indonesia" }, { code: "IE", name: "Ireland" }, 
  { code: "IL", name: "Israel" }, { code: "IN", name: "India" }, { code: "IQ", name: "Iraq" }, 
  { code: "IR", name: "Iran" }, { code: "IS", name: "Iceland" }, { code: "IT", name: "Italy" }, 
  { code: "JM", name: "Jamaica" }, { code: "JO", name: "Jordan" }, { code: "JP", name: "Japan" }, 
  { code: "KE", name: "Kenya" }, { code: "KG", name: "Kyrgyzstan" }, { code: "KI", name: "Kiribati" }, 
  { code: "KR", name: "South Korea" }, { code: "KW", name: "Kuwait" }, { code: "KZ", name: "Kazakhstan" }, 
  { code: "LB", name: "Lebanon" }, { code: "LI", name: "Liechtenstein" }, { code: "LK", name: "Sri Lanka" }, 
  { code: "LT", name: "Lithuania" }, { code: "LU", name: "Luxembourg" }, { code: "LV", name: "Latvia" }, 
  { code: "LY", name: "Libya" }, { code: "MA", name: "Morocco" }, { code: "MC", name: "Monaco" }, 
  { code: "MD", name: "Moldova" }, { code: "ME", name: "Montenegro" }, { code: "MG", name: "Madagascar" }, 
  { code: "MK", name: "North Macedonia" }, { code: "MM", name: "Myanmar" }, { code: "MN", name: "Mongolia" }, 
  { code: "MT", name: "Malta" }, { code: "MV", name: "Maldives" }, { code: "MX", name: "Mexico" }, 
  { code: "MY", name: "Malaysia" }, { code: "MZ", name: "Mozambique" }, { code: "NA", name: "Namibia" }, 
  { code: "NG", name: "Nigeria" }, { code: "NI", name: "Nicaragua" }, { code: "NL", name: "Netherlands" }, 
  { code: "NO", name: "Norway" }, { code: "NP", name: "Nepal" }, { code: "NR", name: "Nauru" }, 
  { code: "NZ", name: "New Zealand" }, { code: "OM", name: "Oman" }, { code: "PA", name: "Panama" }, 
  { code: "PE", name: "Peru" }, { code: "PG", name: "Papua New Guinea" }, { code: "PH", name: "Philippines" }, 
  { code: "PK", name: "Pakistan" }, { code: "PL", name: "Poland" }, { code: "PS", name: "Palestine" }, 
  { code: "PT", name: "Portugal" }, { code: "PW", name: "Palau" }, { code: "PY", name: "Paraguay" }, 
  { code: "QA", name: "Qatar" }, { code: "RO", name: "Romania" }, { code: "RU", name: "Russia" }, 
  { code: "RW", name: "Rwanda" }, { code: "SA", name: "Saudi Arabia" }, { code: "SB", name: "Solomon Islands" }, 
  { code: "SD", name: "Sudan" }, { code: "SE", name: "Sweden" }, { code: "SG", name: "Singapore" }, 
  { code: "SI", name: "Slovenia" }, { code: "SK", name: "Slovakia" }, { code: "SM", name: "San Marino" }, 
  { code: "SN", name: "Senegal" }, { code: "RS", name: "Serbia" }, { code: "SV", name: "El Salvador" }, 
  { code: "SY", name: "Syria" }, { code: "TH", name: "Thailand" }, { code: "TJ", name: "Tajikistan" }, 
  { code: "TL", name: "Timor-Leste" }, { code: "TM", name: "Turkmenistan" }, { code: "TN", name: "Tunisia" }, 
  { code: "TO", name: "Tonga" }, { code: "TR", name: "Turkey" }, { code: "TT", name: "Trinidad and Tobago" }, 
  { code: "TV", name: "Tuvalu" }, { code: "TW", name: "Taiwan" }, { code: "TZ", name: "Tanzania" }, 
  { code: "UA", name: "Ukraine" }, { code: "UG", name: "Uganda" }, { code: "US", name: "United States" }, 
  { code: "UY", name: "Uruguay" }, { code: "UZ", name: "Uzbekistan" }, { code: "VA", name: "Vatican City" }, 
  { code: "VE", name: "Venezuela" }, { code: "VN", name: "Vietnam" }, { code: "VU", name: "Vanuatu" }, 
  { code: "WS", name: "Samoa" }, { code: "YE", name: "Yemen" }, { code: "ZA", name: "South Africa" }, 
  { code: "ZM", name: "Zambia" }, { code: "ZW", name: "Zimbabwe" }
].sort((a, b) => a.name.localeCompare(b.name));

const COURIERS = ["DHL", "UPS", "FedEx", "SF Express", "Aramex", "TNT"];

export default function ForwarderSettings({ loaderData }: Route.ComponentProps) {
  const { forwarder, settings: initialSettings } = loaderData;
  
  // Get live settings data
  const settings = useQuery(
    api.forwarderSettings.getForwarderSettings, 
    forwarder ? { forwarderId: forwarder._id } : "skip"
  );
  
  const upsertZone = useMutation(api.forwarderSettings.upsertShippingZone);
  const upsertRate = useMutation(api.forwarderSettings.upsertShippingRate);
  const updateConsolidatedSettings = useMutation(api.forwarderSettings.updateConsolidatedShippingSettings);
  const deleteZone = useMutation(api.forwarderSettings.deleteShippingZone);
  const deleteRate = useMutation(api.forwarderSettings.deleteShippingRate);

  // UI State
  const [activeTab, setActiveTab] = useState("zones");
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [isAddingRate, setIsAddingRate] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [editingRate, setEditingRate] = useState<any>(null);
  const [showPresetZones, setShowPresetZones] = useState(false);

  // Form states
  const [zoneForm, setZoneForm] = useState({
    zoneName: "",
    countries: [] as string[],
    isActive: true,
  });

  // New hierarchical rate form
  const [selectedZoneForRates, setSelectedZoneForRates] = useState<string>("");
  const [selectedCourier, setSelectedCourier] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  
  const [rateForm, setRateForm] = useState({
    zoneId: "",
    courier: "",
    serviceType: "standard" as "standard" | "express" | "overnight",
    weightSlabs: [
      { minWeight: 0, maxWeight: 1, flatRate: 0, ratePerKg: undefined, label: "0-1kg" },
      { minWeight: 1, maxWeight: 5, flatRate: undefined, ratePerKg: 0, label: "1-5kg" },
      { minWeight: 5, maxWeight: undefined, flatRate: undefined, ratePerKg: 0, label: "5kg+" }
    ] as Array<{
      minWeight: number;
      maxWeight?: number;
      ratePerKg?: number;
      flatRate?: number;
      label: string;
    }>,
    handlingFee: 0,
    insuranceFee: 0,
    fuelSurcharge: 0,
    estimatedDaysMin: 1,
    estimatedDaysMax: 5,
    requiresSignature: false,
    trackingIncluded: true,
    insuranceIncluded: false,
    isActive: true,
  });

  const [consolidatedForm, setConsolidatedForm] = useState({
    isEnabled: false,
    holdingPeriodDays: 7,
    discountPercentage: 10,
    minimumPackages: 2,
    maximumPackages: 10,
    consolidationFrequency: "weekly" as "weekly" | "biweekly" | "monthly" | "custom",
  });

  // Initialize consolidated form with existing data
  useEffect(() => {
    if (settings?.consolidatedSettings) {
      const cs = settings.consolidatedSettings;
      setConsolidatedForm({
        isEnabled: cs.isEnabled,
        holdingPeriodDays: cs.holdingPeriodDays,
        discountPercentage: cs.discountPercentage || 10,
        minimumPackages: cs.minimumPackages || 2,
        maximumPackages: cs.maximumPackages || 10,
        consolidationFrequency: cs.consolidationFrequency || "weekly",
      });
    }
  }, [settings?.consolidatedSettings]);

  if (!forwarder) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You need a forwarder profile to access settings.</p>
        </div>
      </div>
    );
  }

  const handleSaveZone = async () => {
    if (!forwarder || !zoneForm.zoneName || zoneForm.countries.length === 0) return;
    
    try {
      await upsertZone({
        forwarderId: forwarder._id,
        zoneId: editingZone?._id,
        ...zoneForm,
      });
      
      // Reset form
      setZoneForm({ zoneName: "", countries: [], isActive: true });
      setIsAddingZone(false);
      setEditingZone(null);
    } catch (error) {
      console.error("Error saving zone:", error);
      alert("Failed to save zone");
    }
  };

  const handleSaveRate = async () => {
    if (!forwarder || !rateForm.zoneId || !rateForm.courier) return;
    
    // Check for duplicate courier+service combination in the same zone
    const existingRate = settings?.rates?.find((rate: any) => 
      rate.zoneId === rateForm.zoneId &&
      rate.courier === rateForm.courier &&
      rate.serviceType === rateForm.serviceType &&
      rate._id !== editingRate?._id // Allow editing existing rate
    );
    
    if (existingRate) {
      alert(`A rate for ${rateForm.courier} ${rateForm.serviceType} service in this zone already exists. Please edit the existing rate or choose a different courier/service combination.`);
      return;
    }
    
    // Validate weight slabs
    const validSlabs = rateForm.weightSlabs.filter(slab => 
      (slab.flatRate && slab.flatRate > 0) || (slab.ratePerKg && slab.ratePerKg > 0)
    );
    
    if (validSlabs.length === 0) {
      alert("Please set at least one weight slab with a valid rate");
      return;
    }
    
    try {
      await upsertRate({
        forwarderId: forwarder._id,
        rateId: editingRate?._id,
        zoneId: rateForm.zoneId,
        courier: rateForm.courier,
        serviceType: rateForm.serviceType,
        weightSlabs: validSlabs,
        handlingFee: rateForm.handlingFee,
        insuranceFee: rateForm.insuranceFee,
        fuelSurcharge: rateForm.fuelSurcharge,
        estimatedDaysMin: rateForm.estimatedDaysMin,
        estimatedDaysMax: rateForm.estimatedDaysMax,
        requiresSignature: rateForm.requiresSignature,
        trackingIncluded: rateForm.trackingIncluded,
        insuranceIncluded: rateForm.insuranceIncluded,
        isActive: rateForm.isActive,
      });
      
      // Reset form
      setRateForm({
        zoneId: "",
        courier: "",
        serviceType: "standard",
        weightSlabs: [
          { minWeight: 0, maxWeight: 1, flatRate: 0, ratePerKg: undefined, label: "0-1kg" },
          { minWeight: 1, maxWeight: 5, flatRate: undefined, ratePerKg: 0, label: "1-5kg" },
          { minWeight: 5, maxWeight: undefined, flatRate: undefined, ratePerKg: 0, label: "5kg+" }
        ],
        handlingFee: 0,
        insuranceFee: 0,
        fuelSurcharge: 0,
        estimatedDaysMin: 1,
        estimatedDaysMax: 5,
        requiresSignature: false,
        trackingIncluded: true,
        insuranceIncluded: false,
        isActive: true,
      });
      setIsAddingRate(false);
      setEditingRate(null);
      setSelectedZoneForRates("");
      setSelectedCourier("");
      setSelectedService("");
    } catch (error) {
      console.error("Error saving rate:", error);
      alert("Failed to save rate: " + (error as Error).message);
    }
  };

  const handleSaveConsolidatedSettings = async () => {
    if (!forwarder) return;
    
    try {
      await updateConsolidatedSettings({
        forwarderId: forwarder._id,
        ...consolidatedForm,
      });
      alert("Consolidated shipping settings saved!");
    } catch (error) {
      console.error("Error saving consolidated settings:", error);
      alert("Failed to save settings. " + (error as Error).message);
    }
  };

  const startEditingZone = (zone: any) => {
    setEditingZone(zone);
    setZoneForm({
      zoneName: zone.zoneName,
      countries: zone.countries,
      isActive: zone.isActive,
    });
    setIsAddingZone(true);
  };

  const startEditingRate = (rate: any) => {
    setEditingRate(rate);
    setRateForm({
      zoneId: rate.zoneId,
      courier: rate.courier,
      serviceType: rate.serviceType,
      weightSlabs: rate.weightSlabs || [
        { minWeight: 0, maxWeight: 1, flatRate: 0, ratePerKg: undefined, label: "0-1kg" },
        { minWeight: 1, maxWeight: 5, flatRate: undefined, ratePerKg: 0, label: "1-5kg" },
        { minWeight: 5, maxWeight: undefined, flatRate: undefined, ratePerKg: 0, label: "5kg+" }
      ],
      handlingFee: rate.handlingFee,
      insuranceFee: rate.insuranceFee || 0,
      fuelSurcharge: rate.fuelSurcharge || 0,
      estimatedDaysMin: rate.estimatedDaysMin,
      estimatedDaysMax: rate.estimatedDaysMax,
      requiresSignature: rate.requiresSignature || false,
      trackingIncluded: rate.trackingIncluded !== false,
      insuranceIncluded: rate.insuranceIncluded || false,
      isActive: rate.isActive,
    });
    setIsAddingRate(true);
  };

  const duplicateRate = (rate: any) => {
    const zone = settings.zones?.find((z: any) => z._id === rate.zoneId);
    // Clear the form first
    setEditingRate(null);
    setRateForm({
      zoneId: rate.zoneId, // Keep same zone by default
      courier: "", // Clear courier to force selection
      serviceType: "standard", // Reset to standard
      weightSlabs: [...rate.weightSlabs] || [
        { minWeight: 0, maxWeight: 1, flatRate: 0, ratePerKg: undefined, label: "0-1kg" },
        { minWeight: 1, maxWeight: 5, flatRate: undefined, ratePerKg: 0, label: "1-5kg" },
        { minWeight: 5, maxWeight: undefined, flatRate: undefined, ratePerKg: 0, label: "5kg+" }
      ],
      handlingFee: rate.handlingFee,
      insuranceFee: rate.insuranceFee || 0,
      fuelSurcharge: rate.fuelSurcharge || 0,
      estimatedDaysMin: rate.estimatedDaysMin,
      estimatedDaysMax: rate.estimatedDaysMax,
      requiresSignature: rate.requiresSignature || false,
      trackingIncluded: rate.trackingIncluded !== false,
      insuranceIncluded: rate.insuranceIncluded || false,
      isActive: true, // Always set duplicated rates as active
    });
    setIsAddingRate(true);
  };

  const handleSelectPresetZone = async (continent: string, region: string) => {
    if (!forwarder) return;
    
    const countryCodes = getCountryCodesForZone(continent, region);
    const zoneName = region === continent ? continent : `${continent} - ${region}`;
    
    try {
      await upsertZone({
        forwarderId: forwarder._id,
        zoneId: undefined,
        zoneName,
        countries: countryCodes,
        isActive: true,
      });
      
      setShowPresetZones(false);
    } catch (error) {
      console.error("Error creating preset zone:", error);
      alert("Failed to create preset zone");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Forwarder Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your shipping zones, rates, and services
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl">
        <div className="border-b border-border">
          <nav className="flex space-x-8 px-6">
            {[
              { id: "zones", label: "Shipping Zones", count: settings?.zones?.length || 0 },
              { id: "rates", label: "Shipping Rates", count: settings?.rates?.length || 0 },
              { id: "consolidated", label: "Consolidated Shipping", badge: settings?.consolidatedSettings?.isEnabled ? "Enabled" : "Disabled" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      tab.badge === "Enabled" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Shipping Zones Tab */}
          {activeTab === "zones" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Shipping Zones</h2>
                  <p className="text-sm text-muted-foreground">Define geographic regions for your shipping rates</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPresetZones(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-all"
                  >
                    ⚡ Quick Setup
                  </button>
                  <button
                    onClick={() => setIsAddingZone(true)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-medium shadow-sm transition-all"
                  >
                    + Custom Zone
                  </button>
                </div>
              </div>

              {/* Preset Zones Quick Setup */}
              {showPresetZones && (
                <div className="bg-muted/30 border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-medium text-foreground">Quick Zone Setup</h3>
                      <p className="text-sm text-muted-foreground">Choose from predefined geographic regions</p>
                    </div>
                    <button
                      onClick={() => setShowPresetZones(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Object.entries(countryZoneList).map(([continent, regions]) => (
                      <div key={continent} className="bg-background border border-border rounded-lg p-4">
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <span className="text-lg">
                            {continent === "Asia" ? "🌏" : 
                             continent === "Europe" ? "🇪🇺" : 
                             continent === "Africa" ? "🌍" : 
                             continent === "North America" ? "🌎" : 
                             continent === "South America" ? "🌎" : 
                             continent === "Oceania" ? "🇦🇺" : "🌍"}
                          </span>
                          {continent}
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(regions).map(([region, countries]) => (
                            <button
                              key={region}
                              onClick={() => handleSelectPresetZone(continent, region)}
                              className="w-full text-left p-3 rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 transition-all group"
                            >
                              <div className="font-medium text-sm text-foreground group-hover:text-primary">
                                {region}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {countries.length} countries
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 opacity-75">
                                {countries.slice(0, 3).join(", ")}
                                {countries.length > 3 && ` +${countries.length - 3} more`}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 mt-0.5">💡</div>
                      <div>
                        <p className="text-sm font-medium text-blue-900">Pro Tip</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Start with broader regions (like "Europe") and add specific sub-regions later if needed. 
                          You can always create custom zones for unique business requirements.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Add/Edit Zone Form */}
              {isAddingZone && (
                <div className="bg-muted/30 border border-border rounded-xl p-6">
                  <h3 className="text-lg font-medium text-foreground mb-4">
                    {editingZone ? "Edit Zone" : "Add New Zone"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Zone Name</label>
                      <input
                        type="text"
                        value={zoneForm.zoneName}
                        onChange={(e) => setZoneForm({ ...zoneForm, zoneName: e.target.value })}
                        placeholder="e.g., Domestic, International"
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Countries ({zoneForm.countries.length} selected)
                      </label>
                      <div className="border border-border rounded-lg bg-background max-h-64 overflow-y-auto">
                        <div className="p-3">
                          <input
                            type="text"
                            placeholder="Search countries..."
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background mb-3"
                            onChange={(e) => {
                              const searchTerm = e.target.value.toLowerCase();
                              // Filter countries in real-time - you can implement this if needed
                            }}
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                            {ALL_COUNTRIES.map(country => (
                              <label key={country.code} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={zoneForm.countries.includes(country.code)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setZoneForm({ 
                                        ...zoneForm, 
                                        countries: [...zoneForm.countries, country.code] 
                                      });
                                    } else {
                                      setZoneForm({ 
                                        ...zoneForm, 
                                        countries: zoneForm.countries.filter(c => c !== country.code) 
                                      });
                                    }
                                  }}
                                  className="rounded border-border"
                                />
                                <span className="text-sm">{country.name}</span>
                                <span className="text-xs text-muted-foreground ml-auto">{country.code}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setZoneForm({ ...zoneForm, countries: ALL_COUNTRIES.map(c => c.code) })}
                          className="text-xs text-primary hover:text-primary/80"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoneForm({ ...zoneForm, countries: [] })}
                          className="text-xs text-primary hover:text-primary/80"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={zoneForm.isActive}
                        onChange={(e) => setZoneForm({ ...zoneForm, isActive: e.target.checked })}
                        className="rounded border-border"
                      />
                      <span className="text-sm text-foreground">Active</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setIsAddingZone(false);
                          setEditingZone(null);
                          setZoneForm({ zoneName: "", countries: [], isActive: true });
                        }}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveZone}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-medium text-sm transition-all"
                      >
                        Save Zone
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Zones List */}
              <div className="space-y-3">
                {settings?.zones?.map((zone: any) => (
                  <div key={zone._id} className="bg-background border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-foreground">{zone.zoneName}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            zone.isActive 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {zone.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Countries ({zone.countries.length}): {zone.countries.map((code: string) => 
                            ALL_COUNTRIES.find(c => c.code === code)?.name || code
                          ).slice(0, 5).join(", ")}
                          {zone.countries.length > 5 && ` +${zone.countries.length - 5} more`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditingZone(zone)}
                          className="text-primary hover:text-primary/80 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteZone({ zoneId: zone._id })}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {(!settings?.zones || settings.zones.length === 0) && !isAddingZone && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No shipping zones configured yet.</p>
                    <button
                      onClick={() => setIsAddingZone(true)}
                      className="text-primary hover:text-primary/80 text-sm font-medium mt-2"
                    >
                      Add your first zone →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shipping Rates Tab */}
          {activeTab === "rates" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Shipping Rates</h2>
                  <p className="text-sm text-muted-foreground">Set prices for each zone, courier, and service type</p>
                </div>
                <button
                  onClick={() => setIsAddingRate(true)}
                  disabled={!settings?.zones || settings.zones.length === 0}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add Rate
                </button>
              </div>

              {(!settings?.zones || settings.zones.length === 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    You need to create shipping zones first before adding rates.
                  </p>
                </div>
              )}

              {/* Add/Edit Rate Form */}
              {isAddingRate && (
                <div className="bg-muted/30 border border-border rounded-xl p-6">
                  <h3 className="text-lg font-medium text-foreground mb-4">
                    {editingRate ? "Edit Rate" : "Add New Rate"}
                  </h3>
                  
                  {/* Basic Rate Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Zone</label>
                      <select
                        value={rateForm.zoneId}
                        onChange={(e) => setRateForm({ ...rateForm, zoneId: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                      >
                        <option value="">Select Zone</option>
                        {settings?.zones?.filter((z: any) => z.isActive).map((zone: any) => (
                          <option key={zone._id} value={zone._id}>{zone.zoneName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Courier</label>
                      <select
                        value={rateForm.courier}
                        onChange={(e) => setRateForm({ ...rateForm, courier: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                      >
                        <option value="">Select Courier</option>
                        {COURIERS.map(courier => {
                          // Check if this courier+service combination already exists for selected zone
                          const isDisabled = rateForm.zoneId && settings?.rates?.some((rate: any) => 
                            rate.zoneId === rateForm.zoneId &&
                            rate.courier === courier &&
                            rate.serviceType === rateForm.serviceType &&
                            rate._id !== editingRate?._id
                          );
                          return (
                            <option key={courier} value={courier} disabled={isDisabled}>
                              {courier} {isDisabled ? '(Already configured for this service)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Service Type</label>
                      <select
                        value={rateForm.serviceType}
                        onChange={(e) => {
                          const newServiceType = e.target.value as any;
                          // Reset courier if the new service type conflicts
                          const conflictsWithCourier = rateForm.zoneId && rateForm.courier && settings?.rates?.some((rate: any) => 
                            rate.zoneId === rateForm.zoneId &&
                            rate.courier === rateForm.courier &&
                            rate.serviceType === newServiceType &&
                            rate._id !== editingRate?._id
                          );
                          
                          setRateForm({ 
                            ...rateForm, 
                            serviceType: newServiceType,
                            courier: conflictsWithCourier ? "" : rateForm.courier
                          });
                        }}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                      >
                        <option value="standard">Standard</option>
                        <option value="express">Express</option>
                        <option value="overnight">Overnight</option>
                      </select>
                    </div>
                  </div>

                  {/* Validation Warning */}
                  {rateForm.zoneId && rateForm.courier && rateForm.serviceType && settings?.rates?.some((rate: any) => 
                    rate.zoneId === rateForm.zoneId &&
                    rate.courier === rateForm.courier &&
                    rate.serviceType === rateForm.serviceType &&
                    rate._id !== editingRate?._id
                  ) && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="text-red-600 mt-0.5">⚠️</div>
                        <div>
                          <p className="text-sm font-medium text-red-900">Duplicate Configuration</p>
                          <p className="text-xs text-red-700 mt-1">
                            A rate for {rateForm.courier} {rateForm.serviceType} service in this zone already exists. 
                            Please choose a different courier or service type.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Weight Slabs */}
                  <div className="mb-6">
                    <h4 className="text-base font-medium text-foreground mb-3">Weight-Based Pricing Slabs</h4>
                    <div className="space-y-4">
                      {rateForm.weightSlabs.map((slab, index) => (
                        <div key={index} className="bg-background border border-border rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Weight Range Label
                              </label>
                              <input
                                type="text"
                                value={slab.label}
                                onChange={(e) => {
                                  const newSlabs = [...rateForm.weightSlabs];
                                  newSlabs[index].label = e.target.value;
                                  setRateForm({ ...rateForm, weightSlabs: newSlabs });
                                }}
                                placeholder="e.g., 0-1kg"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Min Weight (kg)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                value={slab.minWeight}
                                onChange={(e) => {
                                  const newSlabs = [...rateForm.weightSlabs];
                                  newSlabs[index].minWeight = parseFloat(e.target.value) || 0;
                                  setRateForm({ ...rateForm, weightSlabs: newSlabs });
                                }}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Max Weight (kg) <span className="text-xs text-muted-foreground">(optional)</span>
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                value={slab.maxWeight || ""}
                                onChange={(e) => {
                                  const newSlabs = [...rateForm.weightSlabs];
                                  newSlabs[index].maxWeight = e.target.value ? parseFloat(e.target.value) : undefined;
                                  setRateForm({ ...rateForm, weightSlabs: newSlabs });
                                }}
                                placeholder="Leave empty for unlimited"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => {
                                  const newSlabs = rateForm.weightSlabs.filter((_, i) => i !== index);
                                  setRateForm({ ...rateForm, weightSlabs: newSlabs });
                                }}
                                disabled={rateForm.weightSlabs.length <= 1}
                                className="px-3 py-2 text-red-600 hover:text-red-800 disabled:text-muted-foreground disabled:cursor-not-allowed text-sm font-medium"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Flat Rate ($) <span className="text-xs text-muted-foreground">(fixed price for this range)</span>
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={slab.flatRate || ""}
                                onChange={(e) => {
                                  const newSlabs = [...rateForm.weightSlabs];
                                  newSlabs[index].flatRate = e.target.value ? parseFloat(e.target.value) : undefined;
                                  newSlabs[index].ratePerKg = undefined; // Clear rate per kg when flat rate is set
                                  setRateForm({ ...rateForm, weightSlabs: newSlabs });
                                }}
                                placeholder="Leave empty to use per-kg rate"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Rate per KG ($) <span className="text-xs text-muted-foreground">(price per kilogram)</span>
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={slab.ratePerKg || ""}
                                disabled={!!slab.flatRate}
                                onChange={(e) => {
                                  const newSlabs = [...rateForm.weightSlabs];
                                  newSlabs[index].ratePerKg = e.target.value ? parseFloat(e.target.value) : undefined;
                                  setRateForm({ ...rateForm, weightSlabs: newSlabs });
                                }}
                                placeholder={slab.flatRate ? "Using flat rate" : "e.g., 12.50"}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background disabled:bg-muted disabled:text-muted-foreground"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => {
                          const newSlab = {
                            minWeight: rateForm.weightSlabs[rateForm.weightSlabs.length - 1]?.maxWeight || 0,
                            maxWeight: undefined,
                            flatRate: undefined,
                            ratePerKg: 0,
                            label: `Custom Range ${rateForm.weightSlabs.length + 1}`,
                          };
                          setRateForm({ ...rateForm, weightSlabs: [...rateForm.weightSlabs, newSlab] });
                        }}
                        className="w-full px-4 py-3 border border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                      >
                        + Add Weight Slab
                      </button>
                    </div>
                  </div>

                  {/* Additional Fees */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Handling Fee ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={rateForm.handlingFee}
                        onChange={(e) => setRateForm({ ...rateForm, handlingFee: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Insurance Fee ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={rateForm.insuranceFee}
                        onChange={(e) => setRateForm({ ...rateForm, insuranceFee: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Fuel Surcharge ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={rateForm.fuelSurcharge}
                        onChange={(e) => setRateForm({ ...rateForm, fuelSurcharge: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                      />
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Est. Days (Min)</label>
                        <input
                          type="number"
                          value={rateForm.estimatedDaysMin}
                          onChange={(e) => setRateForm({ ...rateForm, estimatedDaysMin: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Est. Days (Max)</label>
                        <input
                          type="number"
                          value={rateForm.estimatedDaysMax}
                          onChange={(e) => setRateForm({ ...rateForm, estimatedDaysMax: parseInt(e.target.value) || 5 })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-foreground">Service Features</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={rateForm.requiresSignature}
                            onChange={(e) => setRateForm({ ...rateForm, requiresSignature: e.target.checked })}
                            className="rounded border-border"
                          />
                          <span className="text-sm text-foreground">Requires Signature</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={rateForm.trackingIncluded}
                            onChange={(e) => setRateForm({ ...rateForm, trackingIncluded: e.target.checked })}
                            className="rounded border-border"
                          />
                          <span className="text-sm text-foreground">Tracking Included</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={rateForm.insuranceIncluded}
                            onChange={(e) => setRateForm({ ...rateForm, insuranceIncluded: e.target.checked })}
                            className="rounded border-border"
                          />
                          <span className="text-sm text-foreground">Insurance Included</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rateForm.isActive}
                        onChange={(e) => setRateForm({ ...rateForm, isActive: e.target.checked })}
                        className="rounded border-border"
                      />
                      <span className="text-sm text-foreground">Active</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setIsAddingRate(false);
                          setEditingRate(null);
                          setRateForm({
                            zoneId: "",
                            courier: "",
                            serviceType: "standard",
                            weightSlabs: [
                              { minWeight: 0, maxWeight: 1, flatRate: 0, ratePerKg: undefined, label: "0-1kg" },
                              { minWeight: 1, maxWeight: 5, flatRate: undefined, ratePerKg: 0, label: "1-5kg" },
                              { minWeight: 5, maxWeight: undefined, flatRate: undefined, ratePerKg: 0, label: "5kg+" }
                            ],
                            handlingFee: 0,
                            insuranceFee: 0,
                            fuelSurcharge: 0,
                            estimatedDaysMin: 1,
                            estimatedDaysMax: 5,
                            requiresSignature: false,
                            trackingIncluded: true,
                            insuranceIncluded: false,
                            isActive: true,
                          });
                        }}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveRate}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-medium text-sm transition-all"
                      >
                        Save Rate
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Rates List */}
              <div className="space-y-3">
                {settings?.rates?.map((rate: any) => {
                  const zone = settings.zones?.find((z: any) => z._id === rate.zoneId);
                  return (
                    <div key={rate._id} className="bg-background border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-foreground">
                              {zone?.zoneName} • {rate.courier} • {rate.serviceType.charAt(0).toUpperCase() + rate.serviceType.slice(1)}
                            </h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              rate.isActive 
                                ? "bg-green-100 text-green-800" 
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {rate.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          
                          {/* Weight Slabs Display */}
                          <div className="mb-2">
                            <div className="text-sm font-medium text-foreground mb-1">Weight Slabs:</div>
                            <div className="flex flex-wrap gap-2">
                              {rate.weightSlabs?.map((slab: any, index: number) => (
                                <div key={index} className="bg-muted px-2 py-1 rounded text-xs">
                                  <span className="font-medium">{slab.label}:</span>
                                  {slab.flatRate ? (
                                    <span className="text-green-700"> ${slab.flatRate} flat</span>
                                  ) : (
                                    <span className="text-blue-700"> ${slab.ratePerKg}/kg</span>
                                  )}
                                </div>
                              )) || (
                                <div className="text-xs text-orange-600">Legacy rate structure</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            Handling ${rate.handlingFee}
                            {rate.insuranceFee > 0 && <span> • Insurance ${rate.insuranceFee}</span>}
                            {rate.fuelSurcharge > 0 && <span> • Fuel ${rate.fuelSurcharge}</span>}
                            <span> • {rate.estimatedDaysMin}-{rate.estimatedDaysMax} days</span>
                          </div>
                          
                          {/* Service Features */}
                          {(rate.requiresSignature || rate.trackingIncluded || rate.insuranceIncluded) && (
                            <div className="flex gap-2 mt-2">
                              {rate.requiresSignature && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Signature Required</span>
                              )}
                              {rate.trackingIncluded && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Tracking</span>
                              )}
                              {rate.insuranceIncluded && (
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Insurance</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => duplicateRate(rate)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            title="Duplicate this rate"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={() => startEditingRate(rate)}
                            className="text-primary hover:text-primary/80 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteRate({ rateId: rate._id })}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!settings?.rates || settings.rates.length === 0) && !isAddingRate && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No shipping rates configured yet.</p>
                    {settings?.zones && settings.zones.length > 0 && (
                      <button
                        onClick={() => setIsAddingRate(true)}
                        className="text-primary hover:text-primary/80 text-sm font-medium mt-2"
                      >
                        Add your first rate →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Consolidated Shipping Tab */}
          {activeTab === "consolidated" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Consolidated Shipping</h2>
                <p className="text-sm text-muted-foreground">Configure settings for consolidated shipping service</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Enable/Disable Toggle */}
                <div className="bg-background border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-foreground">Enable Consolidated Shipping</h3>
                      <p className="text-sm text-muted-foreground">Allow customers to choose consolidated shipping option</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consolidatedForm.isEnabled}
                        onChange={(e) => setConsolidatedForm({ ...consolidatedForm, isEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  {!consolidatedForm.isEnabled && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        When disabled, you will not appear to customers who select consolidated shipping.
                      </p>
                    </div>
                  )}
                </div>

                {/* Holding Period */}
                <div className="bg-background border border-border rounded-lg p-6">
                  <h3 className="font-medium text-foreground mb-4">Holding Period</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Days to Hold Packages</label>
                      <select
                        value={consolidatedForm.holdingPeriodDays}
                        onChange={(e) => setConsolidatedForm({ ...consolidatedForm, holdingPeriodDays: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                      >
                        <option value={7}>7 Days</option>
                        <option value={15}>15 Days</option>
                        <option value={30}>30 Days</option>
                        <option value={45}>45 Days (Custom)</option>
                        <option value={60}>60 Days (Custom)</option>
                      </select>
                    </div>
                    {consolidatedForm.holdingPeriodDays > 30 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          Extended holding periods may require additional storage fees.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Consolidation Settings */}
                <div className="bg-background border border-border rounded-lg p-6">
                  <h3 className="font-medium text-foreground mb-4">Consolidation Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Discount Percentage</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={consolidatedForm.discountPercentage}
                        onChange={(e) => setConsolidatedForm({ ...consolidatedForm, discountPercentage: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                        placeholder="10"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Discount off standard rates</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Min Packages</label>
                        <input
                          type="number"
                          min="1"
                          value={consolidatedForm.minimumPackages}
                          onChange={(e) => setConsolidatedForm({ ...consolidatedForm, minimumPackages: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Max Packages</label>
                        <input
                          type="number"
                          min="1"
                          value={consolidatedForm.maximumPackages}
                          onChange={(e) => setConsolidatedForm({ ...consolidatedForm, maximumPackages: parseInt(e.target.value) || 10 })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div className="bg-background border border-border rounded-lg p-6">
                  <h3 className="font-medium text-foreground mb-4">Consolidation Schedule</h3>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Frequency</label>
                    <select
                      value={consolidatedForm.consolidationFrequency}
                      onChange={(e) => setConsolidatedForm({ ...consolidatedForm, consolidationFrequency: e.target.value as any })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveConsolidatedSettings}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 font-medium shadow-sm transition-all"
                >
                  Save Consolidated Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}