/**
 * Location-based timezone mapping for logistics operations
 * Maps country/state/city combinations to IANA timezone identifiers
 */

interface TimezoneMapping {
  [country: string]: {
    default: string;
    states?: {
      [state: string]: string | {
        default: string;
        cities?: {
          [city: string]: string;
        };
      };
    };
  };
}

/**
 * Comprehensive location to timezone mapping
 * Focused on major logistics hubs and common business locations
 */
const LOCATION_TIMEZONE_MAP: TimezoneMapping = {
  // Singapore (single timezone)
  "Singapore": {
    default: "Asia/Singapore"
  },
  
  // Malaysia
  "Malaysia": {
    default: "Asia/Kuala_Lumpur"
  },
  
  // Indonesia (multiple timezones)
  "Indonesia": {
    default: "Asia/Jakarta",
    states: {
      "Jakarta": "Asia/Jakarta",
      "West Java": "Asia/Jakarta", 
      "Central Java": "Asia/Jakarta",
      "East Java": "Asia/Jakarta",
      "Bali": "Asia/Makassar",
      "East Kalimantan": "Asia/Makassar",
      "South Sulawesi": "Asia/Makassar",
      "Papua": "Asia/Jayapura"
    }
  },
  
  // Thailand
  "Thailand": {
    default: "Asia/Bangkok"
  },
  
  // Vietnam  
  "Vietnam": {
    default: "Asia/Ho_Chi_Minh"
  },
  
  // Philippines
  "Philippines": {
    default: "Asia/Manila"
  },
  
  // Hong Kong
  "Hong Kong": {
    default: "Asia/Hong_Kong"
  },
  
  // China
  "China": {
    default: "Asia/Shanghai"
  },
  
  // Japan
  "Japan": {
    default: "Asia/Tokyo"
  },
  
  // South Korea
  "South Korea": {
    default: "Asia/Seoul"
  },
  
  // India
  "India": {
    default: "Asia/Kolkata"
  },
  
  // Australia (multiple timezones)
  "Australia": {
    default: "Australia/Sydney",
    states: {
      "New South Wales": "Australia/Sydney",
      "Victoria": "Australia/Melbourne", 
      "Queensland": "Australia/Brisbane",
      "Western Australia": "Australia/Perth",
      "South Australia": "Australia/Adelaide",
      "Tasmania": "Australia/Hobart",
      "Northern Territory": "Australia/Darwin",
      "Australian Capital Territory": "Australia/Sydney"
    }
  },
  
  // United States (multiple timezones)
  "United States": {
    default: "America/New_York",
    states: {
      // Eastern Time
      "New York": "America/New_York",
      "Florida": "America/New_York", 
      "Georgia": "America/New_York",
      "Virginia": "America/New_York",
      "North Carolina": "America/New_York",
      "South Carolina": "America/New_York",
      "Pennsylvania": "America/New_York",
      "New Jersey": "America/New_York",
      "Connecticut": "America/New_York",
      "Massachusetts": "America/New_York",
      "Maryland": "America/New_York",
      "Delaware": "America/New_York",
      "Vermont": "America/New_York",
      "New Hampshire": "America/New_York",
      "Maine": "America/New_York",
      "Rhode Island": "America/New_York",
      
      // Central Time
      "Texas": "America/Chicago",
      "Illinois": "America/Chicago", 
      "Louisiana": "America/Chicago",
      "Alabama": "America/Chicago",
      "Mississippi": "America/Chicago",
      "Tennessee": "America/Chicago",
      "Kentucky": "America/Chicago",
      "Arkansas": "America/Chicago",
      "Oklahoma": "America/Chicago",
      "Kansas": "America/Chicago",
      "Missouri": "America/Chicago",
      "Iowa": "America/Chicago",
      "Minnesota": "America/Chicago",
      "Wisconsin": "America/Chicago",
      "Indiana": "America/Chicago",
      "Michigan": "America/Detroit",
      "Ohio": "America/New_York",
      
      // Mountain Time
      "Colorado": "America/Denver",
      "Utah": "America/Denver",
      "Wyoming": "America/Denver",
      "Montana": "America/Denver",
      "New Mexico": "America/Denver",
      "North Dakota": "America/Chicago",
      "South Dakota": "America/Chicago",
      "Nebraska": "America/Chicago",
      "Arizona": "America/Phoenix", // No DST
      
      // Pacific Time
      "California": "America/Los_Angeles",
      "Washington": "America/Los_Angeles", 
      "Oregon": "America/Los_Angeles",
      "Nevada": "America/Los_Angeles",
      "Idaho": "America/Boise",
      
      // Alaska & Hawaii
      "Alaska": "America/Anchorage",
      "Hawaii": "Pacific/Honolulu"
    }
  },
  
  // Canada (multiple timezones)
  "Canada": {
    default: "America/Toronto",
    states: {
      "Ontario": "America/Toronto",
      "Quebec": "America/Toronto", 
      "Nova Scotia": "America/Halifax",
      "New Brunswick": "America/Halifax",
      "Prince Edward Island": "America/Halifax",
      "Newfoundland and Labrador": "America/St_Johns",
      "Manitoba": "America/Winnipeg",
      "Saskatchewan": "America/Regina",
      "Alberta": "America/Edmonton",
      "British Columbia": "America/Vancouver",
      "Yukon": "America/Whitehorse",
      "Northwest Territories": "America/Yellowknife",
      "Nunavut": "America/Iqaluit"
    }
  },
  
  // United Kingdom
  "United Kingdom": {
    default: "Europe/London"
  },
  "UK": {
    default: "Europe/London"  
  },
  
  // European Union major countries
  "Germany": {
    default: "Europe/Berlin"
  },
  "France": {
    default: "Europe/Paris"
  },
  "Italy": {
    default: "Europe/Rome"
  },
  "Spain": {
    default: "Europe/Madrid"
  },
  "Netherlands": {
    default: "Europe/Amsterdam"
  },
  "Belgium": {
    default: "Europe/Brussels"
  },
  "Switzerland": {
    default: "Europe/Zurich"
  },
  "Austria": {
    default: "Europe/Vienna"
  },
  "Poland": {
    default: "Europe/Warsaw"
  },
  
  // Other major countries
  "Brazil": {
    default: "America/Sao_Paulo",
    states: {
      "Acre": "America/Rio_Branco",
      "Amazonas": "America/Manaus",
      "Rondônia": "America/Porto_Velho",
      "Roraima": "America/Boa_Vista",
      "Mato Grosso": "America/Cuiaba",
      "Mato Grosso do Sul": "America/Campo_Grande"
    }
  },
  
  // Mexico  
  "Mexico": {
    default: "America/Mexico_City",
    states: {
      "Baja California": "America/Tijuana",
      "Baja California Sur": "America/Mazatlan",
      "Sonora": "America/Hermosillo",
      "Sinaloa": "America/Mazatlan",
      "Nayarit": "America/Mazatlan"
    }
  },
  
  // Russia (multiple timezones - simplified)
  "Russia": {
    default: "Europe/Moscow",
    states: {
      "Moscow": "Europe/Moscow",
      "St. Petersburg": "Europe/Moscow",
      "Kaliningrad": "Europe/Kaliningrad", 
      "Yekaterinburg": "Asia/Yekaterinburg",
      "Novosibirsk": "Asia/Novosibirsk",
      "Vladivostok": "Asia/Vladivostok"
    }
  }
};

/**
 * Get timezone from location data (country, state, city)
 */
export function getTimezoneFromLocation(
  country: string, 
  state?: string, 
  city?: string
): string | null {
  try {
    // Normalize input
    const normalizedCountry = country?.trim();
    const normalizedState = state?.trim();
    const normalizedCity = city?.trim();
    
    if (!normalizedCountry) return null;
    
    // Find country mapping (case insensitive)
    const countryKey = Object.keys(LOCATION_TIMEZONE_MAP).find(
      key => key.toLowerCase() === normalizedCountry.toLowerCase()
    );
    
    if (!countryKey) return null;
    
    const countryMapping = LOCATION_TIMEZONE_MAP[countryKey];
    
    // If no state provided, return country default
    if (!normalizedState) {
      return countryMapping.default;
    }
    
    // Check state-level mapping
    if (countryMapping.states) {
      const stateKey = Object.keys(countryMapping.states).find(
        key => key.toLowerCase() === normalizedState.toLowerCase()
      );
      
      if (stateKey) {
        const stateMapping = countryMapping.states[stateKey];
        
        // If state mapping is a string, return it
        if (typeof stateMapping === 'string') {
          return stateMapping;
        }
        
        // If state has city-level mappings and city is provided
        if (typeof stateMapping === 'object' && normalizedCity && stateMapping.cities) {
          const cityKey = Object.keys(stateMapping.cities).find(
            key => key.toLowerCase() === normalizedCity.toLowerCase()
          );
          
          if (cityKey) {
            return stateMapping.cities[cityKey];
          }
        }
        
        // Return state default if no city match
        if (typeof stateMapping === 'object') {
          return stateMapping.default;
        }
      }
    }
    
    // Fallback to country default
    return countryMapping.default;
    
  } catch (error) {
    console.error('Location timezone mapping error:', error);
    return null;
  }
}

/**
 * Get timezone with fallback chain: location -> browser -> UTC
 */
export function getTimezoneWithFallback(
  country?: string,
  state?: string, 
  city?: string,
  browserTimezone?: string
): string {
  // Try location-based first
  if (country) {
    const locationTimezone = getTimezoneFromLocation(country, state, city);
    if (locationTimezone) {
      return locationTimezone;
    }
  }
  
  // Fallback to browser detection
  if (browserTimezone) {
    return browserTimezone;
  }
  
  // Final fallback to UTC
  return 'UTC';
}

/**
 * Validate and get timezone info
 */
export function getTimezoneInfo(timezone: string): {
  timezone: string;
  isValid: boolean;
  displayName: string;
  offset: string;
} {
  try {
    // Test if timezone is valid
    const testDate = new Date();
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'long'
    });
    
    const parts = formatter.formatToParts(testDate);
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || timezone;
    
    // Get offset
    const offsetFormatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    const offsetParts = offsetFormatter.formatToParts(testDate);
    const offset = offsetParts.find(part => part.type === 'timeZoneName')?.value || '';
    
    return {
      timezone,
      isValid: true,
      displayName: timeZoneName,
      offset
    };
    
  } catch (error) {
    return {
      timezone,
      isValid: false, 
      displayName: timezone,
      offset: ''
    };
  }
}

/**
 * Get all supported countries
 */
export function getSupportedCountries(): string[] {
  return Object.keys(LOCATION_TIMEZONE_MAP).sort();
}

/**
 * Get states for a country (if available)
 */
export function getStatesForCountry(country: string): string[] | null {
  const countryKey = Object.keys(LOCATION_TIMEZONE_MAP).find(
    key => key.toLowerCase() === country.toLowerCase()
  );
  
  if (!countryKey) return null;
  
  const countryMapping = LOCATION_TIMEZONE_MAP[countryKey];
  if (!countryMapping.states) return null;
  
  return Object.keys(countryMapping.states).sort();
}