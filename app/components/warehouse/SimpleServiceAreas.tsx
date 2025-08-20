import { useState } from "react";
import { MapPin, Plus, Globe, Trash2, Target } from "lucide-react";
import { getAllCountries } from "../../utils/addressValidation";

interface SimpleServiceAreasProps {
  warehouse: {
    _id: string;
    name: string;
    country: string;
    city: string;
    state?: string;
  };
  currentServiceAreas: {
    primaryCountry: string;
    proximityRadius?: number;
    additionalCountries: string[];
  };
  onChange: (serviceAreas: any) => void;
}

export default function SimpleServiceAreas({ 
  warehouse, 
  currentServiceAreas, 
  onChange 
}: SimpleServiceAreasProps) {
  const [proximityRadius, setProximityRadius] = useState(
    currentServiceAreas.proximityRadius || 0
  );
  const [additionalCountries, setAdditionalCountries] = useState(
    currentServiceAreas.additionalCountries || []
  );
  const [newCountry, setNewCountry] = useState("");

  const allCountries = getAllCountries();
  const availableCountries = allCountries.filter(
    country => 
      country.name !== warehouse.country && 
      !additionalCountries.includes(country.name)
  );

  const handleProximityChange = (radius: number) => {
    setProximityRadius(radius);
    onChange({
      primaryCountry: warehouse.country,
      proximityRadius: radius,
      additionalCountries
    });
  };

  const handleAddCountry = () => {
    if (!newCountry) return;
    
    const updated = [...additionalCountries, newCountry];
    setAdditionalCountries(updated);
    setNewCountry("");
    
    onChange({
      primaryCountry: warehouse.country,
      proximityRadius,
      additionalCountries: updated
    });
  };

  const handleRemoveCountry = (countryToRemove: string) => {
    const updated = additionalCountries.filter(c => c !== countryToRemove);
    setAdditionalCountries(updated);
    
    onChange({
      primaryCountry: warehouse.country,
      proximityRadius,
      additionalCountries: updated
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-blue-900 dark:text-blue-100">
            Auto-Configured Primary Service Area
          </h3>
        </div>
        <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>
              <strong>{warehouse.country}</strong> 
              {warehouse.state && ` (${warehouse.state})`}
              {warehouse.city && ` - ${warehouse.city}`}
            </span>
          </div>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
            ✅ This warehouse automatically accepts packages from {warehouse.country}
          </p>
        </div>
      </div>

      {/* Service Preferences */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
          Service Preferences
        </h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="proximity"
              checked={proximityRadius === 0}
              onChange={() => handleProximityChange(0)}
              className="text-blue-600"
            />
            <div>
              <span className="text-sm font-medium">Accept from anywhere in {warehouse.country}</span>
              <p className="text-xs text-gray-500">Standard option - serve all customers equally</p>
            </div>
          </label>
          
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="proximity"
              checked={proximityRadius === 1}
              onChange={() => handleProximityChange(1)}
              className="text-blue-600"
            />
            <div>
              <span className="text-sm font-medium">Prefer local {warehouse.state || warehouse.city} area</span>
              <p className="text-xs text-gray-500">Show as preferred option for customers in your region</p>
            </div>
          </label>
          
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="proximity"
              checked={proximityRadius === 2}
              onChange={() => handleProximityChange(2)}
              className="text-blue-600"
            />
            <div>
              <span className="text-sm font-medium">Same city priority ({warehouse.city})</span>
              <p className="text-xs text-gray-500">Best rates and fastest processing for local customers</p>
            </div>
          </label>
        </div>
        
        {proximityRadius > 0 && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-300">
            💡 When customers specify their shopping location, you'll appear higher in their search results if you serve their area.
          </div>
        )}
      </div>

      {/* Additional Countries */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
          Additional Countries (Optional)
        </h4>
        
        {additionalCountries.length > 0 && (
          <div className="space-y-2 mb-4">
            {additionalCountries.map((country, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">{country}</span>
                </div>
                <button
                  onClick={() => handleRemoveCountry(country)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <select
            value={newCountry}
            onChange={(e) => setNewCountry(e.target.value)}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
          >
            <option value="">Select additional country...</option>
            {availableCountries.map((country) => (
              <option key={country.code} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddCountry}
            disabled={!newCountry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Add countries where you can also accept packages for international forwarding.
        </p>
      </div>
    </div>
  );
}