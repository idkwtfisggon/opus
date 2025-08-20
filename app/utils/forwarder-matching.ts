// Forwarder address matching utilities for ASN creation

// Extract delivery address from shipping label PDF text
export const extractDeliveryAddress = (pdfText: string): string | null => {
  // Common shipping label address patterns
  const addressPatterns = [
    // "Ship To:" section
    /(?:ship\s+to|deliver\s+to)[:\s]*([^\n]+(?:\n[^\n]+){1,4})/gi,
    // "Delivery Address:" section
    /(?:delivery\s+address|recipient)[:\s]*([^\n]+(?:\n[^\n]+){1,4})/gi,
    // Standard address block (multi-line)
    /([A-Z][a-zA-Z\s&]+\n[^,\n]+,\s*[^,\n]+\s+\d{5,6})/g,
    // Singapore address pattern
    /([^,\n]+\s+(?:Road|Street|Avenue|Drive|Lane|Way|Place)\s*,?\s*[^,\n]*\s+Singapore\s+\d{6})/gi,
  ];

  for (const pattern of addressPatterns) {
    const matches = pdfText.match(pattern);
    if (matches && matches.length > 0) {
      // Clean up the extracted address
      let address = matches[0].replace(/^(ship\s+to|deliver\s+to|delivery\s+address|recipient)[:\s]*/gi, '');
      address = address.replace(/\n+/g, ' ').trim();
      
      if (address.length > 10) { // Basic sanity check
        return address;
      }
    }
  }

  return null;
};

// Extract customer reference from address (e.g., "SARAH-7X5KB2D")
export const extractCustomerRef = (addressOrText: string): string | null => {
  const refPatterns = [
    // Common forwarder reference patterns
    /(?:attn|attention|ref|reference)[:\s]*([A-Z0-9-]{6,20})/gi,
    // Standalone alphanumeric codes
    /\b([A-Z]{3,8}-[A-Z0-9]{5,10})\b/g,
    // Email-like patterns without domain
    /\b([a-z]+[0-9x]{5,10})\b/gi, // like "sarah7x5kb2d"
  ];

  for (const pattern of refPatterns) {
    const matches = addressOrText.match(pattern);
    if (matches && matches.length > 0) {
      const ref = matches[0].replace(/^(attn|attention|ref|reference)[:\s]*/gi, '').trim();
      if (ref.length >= 6 && ref.length <= 20) {
        return ref.toUpperCase();
      }
    }
  }

  return null;
};

// Match forwarder by delivery address
export const matchForwarderByAddress = async (
  deliveryAddress: string,
  forwarders: Array<{ _id: string; businessName: string; warehouses: Array<{ address: string; city: string; country: string; postalCode: string }> }>
): Promise<{ forwarderId: string; matchScore: number; matchedWarehouse?: any } | null> => {
  
  const normalizeAddress = (addr: string) => {
    return addr
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  const normalizedDeliveryAddress = normalizeAddress(deliveryAddress);
  let bestMatch: { forwarderId: string; matchScore: number; matchedWarehouse?: any } | null = null;

  for (const forwarder of forwarders) {
    for (const warehouse of forwarder.warehouses) {
      const warehouseAddress = `${warehouse.address} ${warehouse.city} ${warehouse.country} ${warehouse.postalCode}`;
      const normalizedWarehouseAddress = normalizeAddress(warehouseAddress);

      // Calculate match score based on common words and phrases
      const deliveryWords = normalizedDeliveryAddress.split(' ');
      const warehouseWords = normalizedWarehouseAddress.split(' ');
      
      let matchingWords = 0;
      let totalWords = Math.max(deliveryWords.length, warehouseWords.length);

      // Count exact word matches
      for (const word of deliveryWords) {
        if (word.length > 2 && warehouseWords.includes(word)) {
          matchingWords++;
        }
      }

      // Bonus for postal code match
      const postalCodeMatch = deliveryAddress.includes(warehouse.postalCode);
      if (postalCodeMatch) {
        matchingWords += 2; // Postal codes are highly specific
      }

      // Bonus for exact street name match
      const streetWords = ['road', 'street', 'avenue', 'drive', 'lane', 'way', 'place'];
      for (const streetWord of streetWords) {
        if (normalizedDeliveryAddress.includes(streetWord) && normalizedWarehouseAddress.includes(streetWord)) {
          matchingWords += 1;
        }
      }

      const matchScore = matchingWords / totalWords;

      // Consider it a match if score > 0.6 (60% similarity)
      if (matchScore > 0.6 && (!bestMatch || matchScore > bestMatch.matchScore)) {
        bestMatch = {
          forwarderId: forwarder._id,
          matchScore,
          matchedWarehouse: warehouse
        };
      }
    }
  }

  return bestMatch;
};

// Predict forwarder based on customer shipping patterns
export const predictForwarderFromCustomerHistory = async (
  customerId: string,
  customerAsns: Array<{ forwarderId: string; createdAt: number }>
): Promise<{ forwarderId: string; confidence: number; reason: string } | null> => {
  
  if (customerAsns.length === 0) {
    return null;
  }

  // Count frequency of each forwarder in last 30 days
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentAsns = customerAsns.filter(asn => asn.createdAt > thirtyDaysAgo);

  if (recentAsns.length === 0) {
    return null;
  }

  const forwarderFrequency: { [key: string]: number } = {};
  for (const asn of recentAsns) {
    forwarderFrequency[asn.forwarderId] = (forwarderFrequency[asn.forwarderId] || 0) + 1;
  }

  // Find most frequently used forwarder
  const sortedForwarders = Object.entries(forwarderFrequency)
    .sort(([,a], [,b]) => b - a);

  const [mostUsedForwarderId, frequency] = sortedForwarders[0];
  const totalRecent = recentAsns.length;
  const confidence = frequency / totalRecent;

  // Only suggest if used more than 50% of the time and at least 2 times
  if (confidence >= 0.5 && frequency >= 2) {
    return {
      forwarderId: mostUsedForwarderId,
      confidence,
      reason: `Used ${frequency}/${totalRecent} times in last 30 days`
    };
  }

  return null;
};

// Analyze email content for forwarder hints
export const analyzeEmailForForwarderHints = (emailData: {
  from: string;
  subject: string;
  body: string;
}, customerCountry?: string): { suggestions: string[]; confidence: number } => {
  
  const fullText = `${emailData.subject} ${emailData.body}`.toLowerCase();
  const suggestions: string[] = [];
  let confidence = 0;

  // Look for country mentions
  const countryKeywords = {
    'singapore': ['singapore', 'sg', 'sgp'],
    'malaysia': ['malaysia', 'my', 'mys'],
    'thailand': ['thailand', 'th', 'tha'],
    'indonesia': ['indonesia', 'id', 'idn'],
    'philippines': ['philippines', 'ph', 'phl'],
  };

  for (const [country, keywords] of Object.entries(countryKeywords)) {
    for (const keyword of keywords) {
      if (fullText.includes(keyword)) {
        suggestions.push(`Shipping to ${country}`);
        confidence += 0.3;
        break;
      }
    }
  }

  // Look for warehouse/facility keywords
  const warehouseKeywords = [
    'warehouse', 'facility', 'depot', 'collection point', 
    'fulfillment center', 'distribution center'
  ];

  for (const keyword of warehouseKeywords) {
    if (fullText.includes(keyword)) {
      suggestions.push('Mentions warehouse/facility');
      confidence += 0.2;
      break;
    }
  }

  // Look for forwarder company names (if we have a database of known forwarders)
  const knownForwarders = [
    'sg express', 'malaysia express', 'thailand post', 
    'indonesia cargo', 'philippines logistics'
  ];

  for (const forwarder of knownForwarders) {
    if (fullText.includes(forwarder)) {
      suggestions.push(`Mentions ${forwarder}`);
      confidence += 0.4;
      break;
    }
  }

  // If customer country matches mentioned countries
  if (customerCountry && suggestions.some(s => s.toLowerCase().includes(customerCountry.toLowerCase()))) {
    confidence += 0.2;
  }

  return {
    suggestions,
    confidence: Math.min(confidence, 1.0) // Cap at 1.0
  };
};

// Extract estimated delivery time from email content
export const extractEstimatedDelivery = (emailContent: string): number | null => {
  const deliveryPatterns = [
    // "Delivery by January 15"
    /delivery\s+by\s+([a-z]+\s+\d{1,2}(?:,\s*\d{4})?)/gi,
    // "Expected delivery: Jan 15, 2024"
    /expected\s+delivery[:\s]*([a-z]+\s+\d{1,2},?\s*\d{4})/gi,
    // "Estimated arrival: Tomorrow"
    /estimated\s+arrival[:\s]*(tomorrow|today|\d{1,2}\s+[a-z]+)/gi,
    // "Will arrive in 2-3 business days"
    /will\s+arrive\s+in\s+(\d+[-–]\d+)\s+(?:business\s+)?days?/gi,
  ];

  for (const pattern of deliveryPatterns) {
    const matches = emailContent.match(pattern);
    if (matches && matches.length > 0) {
      const dateStr = matches[0].replace(/^[^:]*[:]\s*/, '').trim();
      
      // Try to parse the date
      try {
        if (dateStr.toLowerCase() === 'tomorrow') {
          return Date.now() + (24 * 60 * 60 * 1000);
        }
        
        if (dateStr.toLowerCase() === 'today') {
          return Date.now();
        }

        // For business days range like "2-3 days"
        const businessDaysMatch = dateStr.match(/(\d+)[-–](\d+)/);
        if (businessDaysMatch) {
          const avgDays = (parseInt(businessDaysMatch[1]) + parseInt(businessDaysMatch[2])) / 2;
          return Date.now() + (avgDays * 24 * 60 * 60 * 1000);
        }

        // Try to parse as a date
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.getTime();
        }
      } catch (error) {
        console.log("Failed to parse delivery date:", dateStr);
      }
    }
  }

  return null;
};