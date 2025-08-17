import isPostalCode from 'validator/lib/isPostalCode';
import isoCountries from 'i18n-iso-countries';

// Initialize with English locale
import en from 'i18n-iso-countries/langs/en.json';

// Register locale - check if already registered to avoid errors
try {
  if (!isoCountries.getNames('en')) {
    isoCountries.registerLocale(en);
  }
} catch {
  isoCountries.registerLocale(en);
}

export function validatePostal(countryA2: string, postal: string) {
  // Fallback to 'any' – or route to a stricter map if needed
  const localeMap: Record<string, string> = {
    US: 'US', CA: 'CA', GB: 'GB', SG: 'SG', AU: 'AU', DE: 'DE',
    FR: 'FR', IT: 'IT', ES: 'ES', NL: 'NL', JP: 'JP', TW: 'TW',
    KR: 'KR', HK: 'HK', MY: 'MY', TH: 'TH', VN: 'VN', PH: 'PH',
    IN: 'IN', CN: 'CN', CH: 'CH', AT: 'AT', BE: 'BE', DK: 'DK',
    FI: 'FI', NO: 'NO', SE: 'SE', PT: 'PT', IE: 'IE', LU: 'LU',
  };
  const loc = localeMap[countryA2.toUpperCase()] ?? 'any';
  return isPostalCode(postal.trim(), loc as any);
}

// Enhanced address validation with detailed error messages
export interface AddressValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  suggestions?: string[];
}

// Google Places API types
export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

export interface PlaceDetails {
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  formatted_address: string;
  place_id: string;
}

export interface GooglePlacesResult {
  predictions?: PlacePrediction[];
  details?: PlaceDetails;
  error?: string;
}

export function validateFullAddress(a: {
  countryA2: string; 
  state?: string; 
  city?: string; 
  line1: string; 
  postal: string;
}): AddressValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Validate country code
  if (!a.countryA2 || a.countryA2.length !== 2) {
    errors.push('Please select a valid country');
  }

  // Validate address line
  if (!a.line1?.trim()) {
    errors.push('Street address is required');
  } else {
    const line1 = a.line1.trim();
    if (line1.length < 3) {
      errors.push('Street address must be at least 3 characters long');
    }
    if (line1.length > 100) {
      errors.push('Street address must be less than 100 characters');
    }
    // Check if address contains a number (most valid addresses do)
    if (!/\d/.test(line1)) {
      warnings.push('Street address typically includes a house or building number');
    }
  }

  // Validate city
  if (!a.city?.trim()) {
    errors.push('City is required');
  } else {
    const city = a.city.trim();
    if (city.length < 2) {
      errors.push('City name must be at least 2 characters long');
    }
    if (city.length > 50) {
      errors.push('City name must be less than 50 characters');
    }
    // Check for invalid characters in city name
    if (!/^[a-zA-Z\s\-'\.]+$/.test(city)) {
      errors.push('City name can only contain letters, spaces, hyphens, apostrophes, and periods');
    }
  }

  // Validate postal code
  if (!a.postal?.trim()) {
    errors.push('Postal code is required');
  } else {
    const postalResult = validatePostalCodeDetailed(a.postal, a.countryA2);
    if (!postalResult.isValid) {
      errors.push(...postalResult.errors);
    }
    if (postalResult.suggestions) {
      suggestions.push(...postalResult.suggestions);
    }
  }

  // Country-specific validations
  if (a.countryA2) {
    const countryCode = a.countryA2.toUpperCase();
    
    // Check if state is required for this country
    if (['US', 'CA', 'AU'].includes(countryCode)) {
      if (!a.state?.trim()) {
        errors.push(`State/Province is required for ${getCountryName(countryCode)}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
}

// Enhanced postal code validation with detailed feedback
export function validatePostalCodeDetailed(postalCode: string, countryA2: string): AddressValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];

  if (!postalCode?.trim()) {
    return {
      isValid: false,
      errors: ['Postal code is required']
    };
  }

  const trimmed = postalCode.trim();
  const countryName = getCountryName(countryA2);
  
  if (!validatePostal(countryA2, trimmed)) {
    errors.push(`Invalid postal code format for ${countryName}`);
    
    // Add specific format suggestions based on country
    const formatSuggestions = getPostalCodeFormatSuggestion(countryA2);
    if (formatSuggestions) {
      suggestions.push(formatSuggestions);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
}

// Get postal code format suggestion for a country
function getPostalCodeFormatSuggestion(countryA2: string): string | null {
  const formatMap: Record<string, string> = {
    'US': 'Expected format: 12345 or 12345-6789',
    'CA': 'Expected format: A1A 1A1 (letter-number-letter space number-letter-number)',
    'GB': 'Expected format: SW1A 1AA (varies by region)',
    'SG': 'Expected format: 123456 (6 digits)',
    'MY': 'Expected format: 12345 (5 digits)',
    'TH': 'Expected format: 12345 (5 digits)',
    'ID': 'Expected format: 12345 (5 digits)',
    'PH': 'Expected format: 1234 (4 digits)',
    'VN': 'Expected format: 12345 or 123456 (5-6 digits)',
    'IN': 'Expected format: 123456 (6 digits)',
    'CN': 'Expected format: 123456 (6 digits)',
    'JP': 'Expected format: 123-4567',
    'KR': 'Expected format: 12345 (5 digits)',
    'HK': 'Expected format: AB1234 (2 letters + 4 digits)',
    'TW': 'Expected format: 12345 (5 digits)',
    'AU': 'Expected format: 1234 (4 digits)',
    'NZ': 'Expected format: 1234 (4 digits)',
    'DE': 'Expected format: 12345 (5 digits)',
    'FR': 'Expected format: 12345 (5 digits)',
    'IT': 'Expected format: 12345 (5 digits)',
    'ES': 'Expected format: 12345 (5 digits)',
    'NL': 'Expected format: 1234 AB (4 digits + space + 2 letters)',
    'CH': 'Expected format: 1234 (4 digits)',
    'SE': 'Expected format: 123 45 (3 digits + space + 2 digits)',
    'NO': 'Expected format: 1234 (4 digits)',
    'DK': 'Expected format: 1234 (4 digits)',
    'ZA': 'Expected format: 1234 (4 digits)',
    'BR': 'Expected format: 12345-678',
    'MX': 'Expected format: 12345 (5 digits)',
    'AR': 'Expected format: A1234ABC',
    'CL': 'Expected format: 1234567 (7 digits)',
  };
  
  return formatMap[countryA2.toUpperCase()] || null;
}

// Legacy function for backward compatibility
export function basicAddressShape(a: {
  countryA2: string; 
  state?: string; 
  city?: string; 
  line1: string; 
  postal: string;
}) {
  const result = validateFullAddress(a);
  if (result.isValid) {
    return { ok: true as const };
  } else {
    return { ok: false, reason: result.errors[0] || 'Invalid address' };
  }
}

// Get country name from ISO code
export function getCountryName(countryA2: string): string {
  return isoCountries.getNames('en', { select: 'official' })[countryA2.toUpperCase()] || countryA2;
}

// Get country code from name
export function getCountryCode(countryName: string): string | undefined {
  try {
    const code = isoCountries.getCode(countryName, 'en');
    if (code) return code;
    
    // Fallback: search in our fallback list
    const country = COUNTRIES_FALLBACK.find(c => c.name === countryName);
    return country?.code;
  } catch (error) {
    console.error('Error getting country code:', error);
    // Fallback: search in our fallback list
    const country = COUNTRIES_FALLBACK.find(c => c.name === countryName);
    return country?.code;
  }
}

// Comprehensive country list as fallback
const COUNTRIES_FALLBACK = [
  { code: 'AD', name: 'Andorra' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AI', name: 'Anguilla' },
  { code: 'AL', name: 'Albania' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AO', name: 'Angola' },
  { code: 'AQ', name: 'Antarctica' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AS', name: 'American Samoa' },
  { code: 'AT', name: 'Austria' },
  { code: 'AU', name: 'Australia' },
  { code: 'AW', name: 'Aruba' },
  { code: 'AX', name: 'Åland Islands' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BI', name: 'Burundi' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BL', name: 'Saint Barthélemy' },
  { code: 'BM', name: 'Bermuda' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BQ', name: 'Caribbean Netherlands' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BV', name: 'Bouvet Island' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BZ', name: 'Belize' },
  { code: 'CA', name: 'Canada' },
  { code: 'CC', name: 'Cocos Islands' },
  { code: 'CD', name: 'Democratic Republic of the Congo' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'CG', name: 'Republic of the Congo' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CI', name: 'Côte d\'Ivoire' },
  { code: 'CK', name: 'Cook Islands' },
  { code: 'CL', name: 'Chile' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CV', name: 'Cape Verde' },
  { code: 'CW', name: 'Curaçao' },
  { code: 'CX', name: 'Christmas Island' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DE', name: 'Germany' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EE', name: 'Estonia' },
  { code: 'EG', name: 'Egypt' },
  { code: 'EH', name: 'Western Sahara' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'ES', name: 'Spain' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FK', name: 'Falkland Islands' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'FO', name: 'Faroe Islands' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GE', name: 'Georgia' },
  { code: 'GF', name: 'French Guiana' },
  { code: 'GG', name: 'Guernsey' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GI', name: 'Gibraltar' },
  { code: 'GL', name: 'Greenland' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GP', name: 'Guadeloupe' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'GR', name: 'Greece' },
  { code: 'GS', name: 'South Georgia and the South Sandwich Islands' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GU', name: 'Guam' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HM', name: 'Heard Island and McDonald Islands' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HR', name: 'Croatia' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HU', name: 'Hungary' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IM', name: 'Isle of Man' },
  { code: 'IN', name: 'India' },
  { code: 'IO', name: 'British Indian Ocean Territory' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IR', name: 'Iran' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IT', name: 'Italy' },
  { code: 'JE', name: 'Jersey' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JO', name: 'Jordan' },
  { code: 'JP', name: 'Japan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KM', name: 'Comoros' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'KP', name: 'North Korea' },
  { code: 'KR', name: 'South Korea' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KY', name: 'Cayman Islands' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LY', name: 'Libya' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MD', name: 'Moldova' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MF', name: 'Saint Martin' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'ML', name: 'Mali' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'MO', name: 'Macau' },
  { code: 'MP', name: 'Northern Mariana Islands' },
  { code: 'MQ', name: 'Martinique' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MS', name: 'Montserrat' },
  { code: 'MT', name: 'Malta' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MV', name: 'Maldives' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NC', name: 'New Caledonia' },
  { code: 'NE', name: 'Niger' },
  { code: 'NF', name: 'Norfolk Island' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NU', name: 'Niue' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'OM', name: 'Oman' },
  { code: 'PA', name: 'Panama' },
  { code: 'PE', name: 'Peru' },
  { code: 'PF', name: 'French Polynesia' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PL', name: 'Poland' },
  { code: 'PM', name: 'Saint Pierre and Miquelon' },
  { code: 'PN', name: 'Pitcairn Islands' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'PS', name: 'Palestine' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PW', name: 'Palau' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RE', name: 'Réunion' },
  { code: 'RO', name: 'Romania' },
  { code: 'RS', name: 'Serbia' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SE', name: 'Sweden' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SH', name: 'Saint Helena' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SJ', name: 'Svalbard and Jan Mayen' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SM', name: 'San Marino' },
  { code: 'SN', name: 'Senegal' },
  { code: 'SO', name: 'Somalia' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ST', name: 'São Tomé and Príncipe' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'SX', name: 'Sint Maarten' },
  { code: 'SY', name: 'Syria' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'TC', name: 'Turks and Caicos Islands' },
  { code: 'TD', name: 'Chad' },
  { code: 'TF', name: 'French Southern Territories' },
  { code: 'TG', name: 'Togo' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TK', name: 'Tokelau' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UM', name: 'United States Minor Outlying Islands' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VA', name: 'Vatican City' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VG', name: 'British Virgin Islands' },
  { code: 'VI', name: 'United States Virgin Islands' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'WF', name: 'Wallis and Futuna' },
  { code: 'WS', name: 'Samoa' },
  { code: 'YE', name: 'Yemen' },
  { code: 'YT', name: 'Mayotte' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
];

// Get list of all countries with codes
export function getAllCountries(): Array<{ code: string; name: string }> {
  try {
    const countries = isoCountries.getNames('en', { select: 'official' });
    console.log('Raw countries data:', Object.keys(countries || {}).length);
    if (countries && Object.keys(countries).length > 0) {
      const result = Object.entries(countries).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
      console.log('Processed countries:', result.length);
      return result;
    } else {
      console.log('Using fallback country list');
      return COUNTRIES_FALLBACK;
    }
  } catch (error) {
    console.error('Error getting countries:', error);
    console.log('Using fallback country list');
    return COUNTRIES_FALLBACK;
  }
}

// Get common states for selected countries
export function getStatesForCountry(countryA2: string): Array<{ code: string; name: string }> {
  const stateMap: Record<string, Array<{ code: string; name: string }>> = {
    US: [
      { code: 'AL', name: 'Alabama' },
      { code: 'AK', name: 'Alaska' },
      { code: 'AZ', name: 'Arizona' },
      { code: 'AR', name: 'Arkansas' },
      { code: 'CA', name: 'California' },
      { code: 'CO', name: 'Colorado' },
      { code: 'CT', name: 'Connecticut' },
      { code: 'DE', name: 'Delaware' },
      { code: 'FL', name: 'Florida' },
      { code: 'GA', name: 'Georgia' },
      { code: 'HI', name: 'Hawaii' },
      { code: 'ID', name: 'Idaho' },
      { code: 'IL', name: 'Illinois' },
      { code: 'IN', name: 'Indiana' },
      { code: 'IA', name: 'Iowa' },
      { code: 'KS', name: 'Kansas' },
      { code: 'KY', name: 'Kentucky' },
      { code: 'LA', name: 'Louisiana' },
      { code: 'ME', name: 'Maine' },
      { code: 'MD', name: 'Maryland' },
      { code: 'MA', name: 'Massachusetts' },
      { code: 'MI', name: 'Michigan' },
      { code: 'MN', name: 'Minnesota' },
      { code: 'MS', name: 'Mississippi' },
      { code: 'MO', name: 'Missouri' },
      { code: 'MT', name: 'Montana' },
      { code: 'NE', name: 'Nebraska' },
      { code: 'NV', name: 'Nevada' },
      { code: 'NH', name: 'New Hampshire' },
      { code: 'NJ', name: 'New Jersey' },
      { code: 'NM', name: 'New Mexico' },
      { code: 'NY', name: 'New York' },
      { code: 'NC', name: 'North Carolina' },
      { code: 'ND', name: 'North Dakota' },
      { code: 'OH', name: 'Ohio' },
      { code: 'OK', name: 'Oklahoma' },
      { code: 'OR', name: 'Oregon' },
      { code: 'PA', name: 'Pennsylvania' },
      { code: 'RI', name: 'Rhode Island' },
      { code: 'SC', name: 'South Carolina' },
      { code: 'SD', name: 'South Dakota' },
      { code: 'TN', name: 'Tennessee' },
      { code: 'TX', name: 'Texas' },
      { code: 'UT', name: 'Utah' },
      { code: 'VT', name: 'Vermont' },
      { code: 'VA', name: 'Virginia' },
      { code: 'WA', name: 'Washington' },
      { code: 'WV', name: 'West Virginia' },
      { code: 'WI', name: 'Wisconsin' },
      { code: 'WY', name: 'Wyoming' },
    ],
    CA: [
      { code: 'AB', name: 'Alberta' },
      { code: 'BC', name: 'British Columbia' },
      { code: 'MB', name: 'Manitoba' },
      { code: 'NB', name: 'New Brunswick' },
      { code: 'NL', name: 'Newfoundland and Labrador' },
      { code: 'NT', name: 'Northwest Territories' },
      { code: 'NS', name: 'Nova Scotia' },
      { code: 'NU', name: 'Nunavut' },
      { code: 'ON', name: 'Ontario' },
      { code: 'PE', name: 'Prince Edward Island' },
      { code: 'QC', name: 'Quebec' },
      { code: 'SK', name: 'Saskatchewan' },
      { code: 'YT', name: 'Yukon' },
    ],
    AU: [
      { code: 'NSW', name: 'New South Wales' },
      { code: 'VIC', name: 'Victoria' },
      { code: 'QLD', name: 'Queensland' },
      { code: 'WA', name: 'Western Australia' },
      { code: 'SA', name: 'South Australia' },
      { code: 'TAS', name: 'Tasmania' },
      { code: 'NT', name: 'Northern Territory' },
      { code: 'ACT', name: 'Australian Capital Territory' },
    ],
    DE: [
      { code: 'BW', name: 'Baden-Württemberg' },
      { code: 'BY', name: 'Bavaria' },
      { code: 'BE', name: 'Berlin' },
      { code: 'BB', name: 'Brandenburg' },
      { code: 'HB', name: 'Bremen' },
      { code: 'HH', name: 'Hamburg' },
      { code: 'HE', name: 'Hesse' },
      { code: 'MV', name: 'Mecklenburg-Vorpommern' },
      { code: 'NI', name: 'Lower Saxony' },
      { code: 'NW', name: 'North Rhine-Westphalia' },
      { code: 'RP', name: 'Rhineland-Palatinate' },
      { code: 'SL', name: 'Saarland' },
      { code: 'SN', name: 'Saxony' },
      { code: 'ST', name: 'Saxony-Anhalt' },
      { code: 'SH', name: 'Schleswig-Holstein' },
      { code: 'TH', name: 'Thuringia' },
    ],
    GB: [
      { code: 'ENG', name: 'England' },
      { code: 'SCT', name: 'Scotland' },
      { code: 'WLS', name: 'Wales' },
      { code: 'NIR', name: 'Northern Ireland' },
    ],
    FR: [
      { code: 'ARA', name: 'Auvergne-Rhône-Alpes' },
      { code: 'BFC', name: 'Bourgogne-Franche-Comté' },
      { code: 'BRE', name: 'Brittany' },
      { code: 'CVL', name: 'Centre-Val de Loire' },
      { code: 'COR', name: 'Corsica' },
      { code: 'GES', name: 'Grand Est' },
      { code: 'HDF', name: 'Hauts-de-France' },
      { code: 'IDF', name: 'Île-de-France' },
      { code: 'NOR', name: 'Normandy' },
      { code: 'NAQ', name: 'Nouvelle-Aquitaine' },
      { code: 'OCC', name: 'Occitania' },
      { code: 'PDL', name: 'Pays de la Loire' },
      { code: 'PAC', name: 'Provence-Alpes-Côte d\'Azur' },
    ],
  };
  
  return stateMap[countryA2.toUpperCase()] || [];
}

// Session token for cost optimization
let currentSessionToken = '';
function generateSessionToken(): string {
  if (!currentSessionToken) {
    currentSessionToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  return currentSessionToken;
}

function clearSessionToken(): void {
  currentSessionToken = '';
}

// Get address predictions from Google Places Autocomplete via API route
export async function getAddressPredictions(input: string, countryBias?: string): Promise<GooglePlacesResult> {
  if (!input.trim() || input.length < 3) {
    return { predictions: [] };
  }

  try {
    const sessionToken = generateSessionToken();
    
    // Build URL with parameters for our API route
    const params = new URLSearchParams({
      input: input.trim(),
      sessiontoken: sessionToken,
    });

    // Add country bias if provided
    if (countryBias) {
      params.append('components', `country:${countryBias}`);
    }

    const response = await fetch(`/api/places/autocomplete?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      return { error: data.error };
    }

    if (data.status === 'OK') {
      return { predictions: data.predictions || [] };
    } else if (data.status === 'ZERO_RESULTS') {
      return { predictions: [] };
    } else {
      return { error: data.error_message || data.status || `Google Places API error: ${data.status || 'Unknown status'}` };
    }
  } catch (error) {
    console.error('Error fetching address predictions:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get detailed address information from place_id via API route
export async function getPlaceDetails(placeId: string): Promise<GooglePlacesResult> {
  try {
    const sessionToken = generateSessionToken();
    
    const params = new URLSearchParams({
      place_id: placeId,
      sessiontoken: sessionToken,
    });

    const response = await fetch(`/api/places/details?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Clear session token after successful place details call (end of session)
    clearSessionToken();

    if (data.error) {
      return { error: data.error };
    }

    if (data.status === 'OK') {
      return { details: data.result };
    } else {
      return { error: data.error_message || data.status || `Google Places API error: ${data.status || 'Unknown status'}` };
    }
  } catch (error) {
    console.error('Error fetching place details:', error);
    clearSessionToken(); // Clear on error too
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Parse address components from Google Places API result
export function parseAddressComponents(details: PlaceDetails): {
  streetNumber?: string;
  route?: string;
  locality?: string;
  administrativeAreaLevel1?: string;
  country?: string;
  postalCode?: string;
  formattedAddress: string;
} {
  const components = details.address_components;
  const result: any = {
    formattedAddress: details.formatted_address,
  };

  components.forEach(component => {
    const types = component.types;
    
    if (types.includes('street_number')) {
      result.streetNumber = component.long_name;
    } else if (types.includes('route')) {
      result.route = component.long_name;
    } else if (types.includes('locality')) {
      result.locality = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      result.administrativeAreaLevel1 = component.short_name; // State/province code
    } else if (types.includes('country')) {
      result.country = component.short_name; // Country code
    } else if (types.includes('postal_code')) {
      result.postalCode = component.long_name;
    }
  });

  return result;
}

// Convert Google Places result to form data
export function convertPlaceToFormData(details: PlaceDetails): {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
} {
  const components = parseAddressComponents(details);
  
  // Combine street number and route for full address
  const addressParts = [];
  if (components.streetNumber) addressParts.push(components.streetNumber);
  if (components.route) addressParts.push(components.route);
  
  return {
    address: addressParts.join(' ') || '',
    city: components.locality || '',
    state: components.administrativeAreaLevel1 || '',
    country: components.country || '',
    postalCode: components.postalCode || '',
  };
}

// Enhanced validation that incorporates Google Places API
export async function validateAddressWithGoogle(
  input: string, 
  countryBias?: string
): Promise<AddressValidationResult & { googleSuggestions?: PlacePrediction[] }> {
  // First, try Google Places API
  try {
    const googleResult = await getAddressPredictions(input, countryBias);
    
    if (googleResult.error) {
      // Fallback to format validation if Google API fails
      console.warn('Google Places API error, falling back to format validation:', googleResult.error);
      return validateBasicAddressFormat(input);
    }

    if (googleResult.predictions && googleResult.predictions.length > 0) {
      return {
        isValid: true,
        errors: [],
        suggestions: ['Address suggestions available from Google Places'],
        googleSuggestions: googleResult.predictions,
      };
    } else {
      // No Google suggestions, validate format
      const formatResult = validateBasicAddressFormat(input);
      return {
        ...formatResult,
        warnings: [...(formatResult.warnings || []), 'No address suggestions found'],
      };
    }
  } catch (error) {
    console.error('Error in Google Places validation:', error);
    // Fallback to format validation
    return validateBasicAddressFormat(input);
  }
}

// Basic format validation for fallback
function validateBasicAddressFormat(input: string): AddressValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.trim()) {
    errors.push('Address is required');
  } else if (input.trim().length < 5) {
    errors.push('Address must be at least 5 characters long');
  } else if (!/\d/.test(input)) {
    warnings.push('Address typically includes a house or building number');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}