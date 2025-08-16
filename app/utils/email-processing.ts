// Email processing utilities for shipping confirmations

// Extract tracking numbers from text using regex patterns
export const extractTrackingNumbers = (text: string): string[] => {
  const trackingPatterns = [
    // UPS: 1Z followed by 8 alphanumeric, 2 numeric, 6 alphanumeric
    /1Z[A-Z0-9]{8}[0-9]{2}[A-Z0-9]{6}/gi,
    // FedEx: 12-14 digit number
    /\b[0-9]{12,14}\b/g,
    // DHL: 10-11 digit number starting with specific patterns
    /\b(?:JD|JB|JA)[0-9]{8}\b/g,
    // USPS: various patterns
    /\b(?:9[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}\s?[0-9]{2}|[A-Z]{2}[0-9]{9}US)\b/g,
    // Generic alphanumeric tracking (fallback)
    /\b[A-Z0-9]{8,20}\b/g,
  ];

  const trackingNumbers: string[] = [];
  
  trackingPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      trackingNumbers.push(...matches);
    }
  });

  // Remove duplicates and filter out obvious non-tracking numbers
  return [...new Set(trackingNumbers)].filter(num => 
    num.length >= 8 && 
    num.length <= 30 &&
    !/^[0-9]{1,4}$/.test(num) // Exclude short numbers
  );
};

// Extract order numbers from text
export const extractOrderNumbers = (text: string): string[] => {
  const orderPatterns = [
    // Order #123456
    /(?:order|order#|order\s+#|order\s+number)[:\s#]*([A-Z0-9-]{4,20})/gi,
    // #123456 (standalone)
    /#([A-Z0-9-]{4,20})/g,
    // Order ID: 123456
    /(?:order\s+id|orderid)[:\s]*([A-Z0-9-]{4,20})/gi,
  ];

  const orderNumbers: string[] = [];
  
  orderPatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1]) {
        orderNumbers.push(match[1]);
      }
    });
  });

  return [...new Set(orderNumbers)];
};

// Extract shop/merchant name from email
export const extractShopName = (fromEmail: string, subject: string, body: string): string | undefined => {
  // Try to extract from email domain
  const emailDomain = fromEmail.split('@')[1]?.toLowerCase();
  
  const knownShops = [
    'amazon', 'aliexpress', 'ebay', 'shopify', 'etsy', 'walmart', 
    'target', 'bestbuy', 'macys', 'nordstrom', 'zappos', 'wayfair'
  ];

  for (const shop of knownShops) {
    if (emailDomain?.includes(shop)) {
      return shop.charAt(0).toUpperCase() + shop.slice(1);
    }
  }

  // Try to extract from subject line
  const subjectLower = subject.toLowerCase();
  for (const shop of knownShops) {
    if (subjectLower.includes(shop)) {
      return shop.charAt(0).toUpperCase() + shop.slice(1);
    }
  }

  // Try generic patterns in email domain
  if (emailDomain) {
    const domainParts = emailDomain.split('.');
    if (domainParts.length >= 2) {
      return domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
    }
  }

  return undefined;
};

// Extract monetary values
export const extractValue = (text: string): { value: number; currency: string } | undefined => {
  const currencyPatterns = [
    // $123.45
    /\$([0-9,]+(?:\.[0-9]{2})?)/g,
    // €123.45
    /€([0-9,]+(?:\.[0-9]{2})?)/g,
    // £123.45
    /£([0-9,]+(?:\.[0-9]{2})?)/g,
    // ¥123
    /¥([0-9,]+)/g,
    // USD 123.45
    /USD\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
    // EUR 123.45
    /EUR\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
  ];

  for (const pattern of currencyPatterns) {
    const match = text.match(pattern);
    if (match) {
      const valueStr = match[1]?.replace(/,/g, '');
      const value = parseFloat(valueStr);
      if (!isNaN(value) && value > 0) {
        const currency = pattern.source.includes('$') ? 'USD' :
                        pattern.source.includes('€') ? 'EUR' :
                        pattern.source.includes('£') ? 'GBP' :
                        pattern.source.includes('¥') ? 'JPY' :
                        pattern.source.includes('USD') ? 'USD' :
                        pattern.source.includes('EUR') ? 'EUR' : 'USD';
        return { value, currency };
      }
    }
  }

  return undefined;
};

// Extract weight information
export const extractWeight = (text: string): number | undefined => {
  const weightPatterns = [
    // 2.5 kg, 2.5kg
    /([0-9]+\.?[0-9]*)\s*kg/gi,
    // 2.5 lbs, 2.5lbs  
    /([0-9]+\.?[0-9]*)\s*lbs?/gi,
    // Weight: 2.5
    /weight[:\s]*([0-9]+\.?[0-9]*)/gi,
  ];

  for (const pattern of weightPatterns) {
    const match = text.match(pattern);
    if (match) {
      const weightStr = match[1];
      const weight = parseFloat(weightStr);
      if (!isNaN(weight) && weight > 0) {
        // Convert lbs to kg if necessary
        return pattern.source.includes('lbs') ? weight * 0.453592 : weight;
      }
    }
  }

  return undefined;
};

// Process PDF attachment
export const processPDFAttachment = async (pdfBuffer: Buffer): Promise<{
  text: string;
  trackingNumbers: string[];
  orderNumbers: string[];
  extractedData: any;
}> => {
  try {
    // Dynamic import to avoid SSR issues
    const pdfParse = (await import('pdf-parse')).default;
    
    // Extract text from PDF
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;

    // Extract relevant information
    const trackingNumbers = extractTrackingNumbers(text);
    const orderNumbers = extractOrderNumbers(text);
    const value = extractValue(text);
    const weight = extractWeight(text);

    return {
      text,
      trackingNumbers,
      orderNumbers,
      extractedData: {
        value: value?.value,
        currency: value?.currency,
        weight,
        pageCount: pdfData.numpages,
      }
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    return {
      text: '',
      trackingNumbers: [],
      orderNumbers: [],
      extractedData: {}
    };
  }
};

// Spam detection logic
export const detectSpam = (email: {
  from: string;
  subject: string;
  body: string;
  attachments: any[];
}): { isSpam: boolean; confidence: number; reasons: string[] } => {
  const reasons: string[] = [];
  let spamScore = 0;

  // Check for shipping-related keywords (positive signals)
  const shippingKeywords = [
    'shipped', 'tracking', 'delivery', 'dispatch', 'fulfillment',
    'order', 'confirmation', 'receipt', 'invoice', 'courier'
  ];

  const hasShippingKeywords = shippingKeywords.some(keyword => 
    email.subject.toLowerCase().includes(keyword) || 
    email.body.toLowerCase().includes(keyword)
  );

  if (!hasShippingKeywords) {
    spamScore += 0.3;
    reasons.push('No shipping keywords found');
  }

  // Check for spam indicators (negative signals)
  const spamKeywords = [
    'free', 'winner', 'urgent', 'limited time', 'act now',
    'congratulations', 'click here', 'unsubscribe', 'newsletter'
  ];

  const hasSpamKeywords = spamKeywords.some(keyword =>
    email.subject.toLowerCase().includes(keyword) ||
    email.body.toLowerCase().includes(keyword)
  );

  if (hasSpamKeywords) {
    spamScore += 0.4;
    reasons.push('Contains spam keywords');
  }

  // Check for tracking numbers (positive signal)
  const trackingNumbers = extractTrackingNumbers(email.body + ' ' + email.subject);
  if (trackingNumbers.length === 0) {
    spamScore += 0.2;
    reasons.push('No tracking numbers found');
  }

  // Check for order numbers (positive signal)
  const orderNumbers = extractOrderNumbers(email.body + ' ' + email.subject);
  if (orderNumbers.length === 0) {
    spamScore += 0.1;
    reasons.push('No order numbers found');
  }

  // Check for PDF attachments (positive signal for shipping)
  const hasPDFAttachment = email.attachments.some(att => 
    att.contentType === 'application/pdf'
  );

  if (!hasPDFAttachment && trackingNumbers.length === 0) {
    spamScore += 0.2;
    reasons.push('No PDF attachments and no tracking numbers');
  }

  // Check sender patterns
  const senderDomain = email.from.split('@')[1]?.toLowerCase();
  const shippingSenderPatterns = [
    'order', 'shipping', 'noreply', 'confirm', 'receipt'
  ];

  const hasShippingSender = shippingSenderPatterns.some(pattern =>
    email.from.toLowerCase().includes(pattern)
  );

  if (!hasShippingSender) {
    spamScore += 0.1;
    reasons.push('Sender does not appear to be shipping-related');
  }

  // Final determination
  const isSpam = spamScore > 0.5;
  const confidence = Math.min(1, Math.max(0, 1 - spamScore));

  return {
    isSpam,
    confidence,
    reasons: isSpam ? reasons : []
  };
};

// Main email processing function
export const processEmail = async (emailData: {
  from: string;
  to: string;
  subject: string;
  body: string;
  attachments: Array<{
    filename: string;
    contentType: string;
    content: Buffer;
  }>;
}) => {
  // Extract data from email body and subject
  const fullText = emailData.body + ' ' + emailData.subject;
  let trackingNumbers = extractTrackingNumbers(fullText);
  let orderNumbers = extractOrderNumbers(fullText);
  
  const shopName = extractShopName(emailData.from, emailData.subject, emailData.body);
  const value = extractValue(fullText);
  const weight = extractWeight(fullText);

  // Process PDF attachments
  const pdfData: any[] = [];
  for (const attachment of emailData.attachments) {
    if (attachment.contentType === 'application/pdf') {
      const pdfResult = await processPDFAttachment(attachment.content);
      pdfData.push(pdfResult);
      
      // Merge tracking and order numbers from PDF
      trackingNumbers = [...trackingNumbers, ...pdfResult.trackingNumbers];
      orderNumbers = [...orderNumbers, ...pdfResult.orderNumbers];
    }
  }

  // Remove duplicates
  trackingNumbers = [...new Set(trackingNumbers)];
  orderNumbers = [...new Set(orderNumbers)];

  // Run spam detection
  const spamDetection = detectSpam(emailData);

  return {
    extractedData: {
      trackingNumbers,
      orderNumbers,
      shopName,
      estimatedValue: value?.value,
      currency: value?.currency,
      weight,
    },
    isShippingEmail: !spamDetection.isSpam,
    confidence: spamDetection.confidence,
    spamScore: 1 - spamDetection.confidence,
    spamReasons: spamDetection.reasons,
    pdfData,
  };
};