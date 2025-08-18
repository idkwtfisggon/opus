/**
 * OPUS1 PROJECT UNDERSTANDING
 * A comprehensive analysis of this React Router v7 + Convex logistics application
 * Created: 2025-01-18
 * 
 * This file serves as the core understanding document for the entire codebase.
 * It breaks down the architecture, business logic, and technical implementation.
 */

export interface ProjectUnderstanding {
  // High-level project overview
  projectType: "logistics-saas-platform";
  techStack: TechStack;
  businessModel: BusinessModel;
  userRoles: UserRoles;
  coreFeatures: CoreFeatures;
  architecture: Architecture;
  databaseSchema: DatabaseSchema;
  integrations: Integrations;
  deployment: Deployment;
}

// ==================== TECH STACK ====================
interface TechStack {
  frontend: {
    framework: "React Router v7"; // Full-stack React framework with SSR
    styling: "TailwindCSS v4"; // Modern utility-first CSS
    components: "Radix UI + shadcn/ui"; // Component library
    icons: ["Lucide React", "Tabler Icons"];
    animations: "Motion"; // Smooth animations
    charts: "Recharts"; // Data visualization
  };
  backend: {
    database: "Convex"; // Real-time serverless database
    auth: "Clerk"; // Authentication and user management
    payments: "Polar.sh"; // Subscription billing
    ai: "OpenAI"; // AI chat capabilities
    email: "Mailgun"; // Email processing
    storage: "Convex Files"; // File storage
  };
  development: {
    buildTool: "Vite"; // Fast build tool
    language: "TypeScript"; // Type safety
    linting: "React Router dev tools";
  };
  deployment: {
    platform: "Vercel"; // Primary deployment target
    containerization: "Docker"; // Alternative deployment
  };
}

// ==================== BUSINESS MODEL ====================
interface BusinessModel {
  type: "B2B SaaS - Package Forwarding Platform";
  description: "A logistics platform connecting customers who need package forwarding services with forwarders who provide warehousing and shipping";
  
  primaryActors: {
    customers: "Individuals/businesses needing packages forwarded from various countries";
    forwarders: "Logistics companies offering warehousing and forwarding services";
    staff: "Warehouse workers managing physical operations";
  };
  
  revenueStreams: [
    "Subscription fees from forwarders",
    "Transaction fees on shipments",
    "Premium features and integrations"
  ];
  
  keyValuePropositions: {
    forCustomers: [
      "Global shipping address in multiple countries",
      "Package consolidation to save on shipping",
      "Real-time tracking and notifications",
      "Email forwarding for shipping confirmations"
    ];
    forForwarders: [
      "Complete warehouse management system",
      "Staff management and barcode scanning",
      "Courier integrations (DHL, UPS, FedEx)",
      "Analytics and reporting"
    ];
  };
}

// ==================== USER ROLES & PERMISSIONS ====================
interface UserRoles {
  customer: {
    description: "End users who need package forwarding services";
    permissions: [
      "Create and track orders",
      "Manage shipping addresses",
      "View email forwarding inbox",
      "Update account settings",
      "Choose forwarders"
    ];
    dashboardFeatures: [
      "Order tracking",
      "Email management",
      "Shipping address book",
      "Forwarder selection"
    ];
  };
  
  forwarder: {
    description: "Business owners running forwarding operations";
    permissions: [
      "Manage warehouses and staff",
      "Set shipping rates and zones",
      "View analytics and reports",
      "Configure courier integrations",
      "Manage order workflow"
    ];
    dashboardFeatures: [
      "Order management",
      "Staff oversight",
      "Service area configuration",
      "Rate management",
      "Analytics dashboard"
    ];
  };
  
  staff: {
    description: "Warehouse workers handling physical operations";
    permissions: [
      "Scan barcodes",
      "Update order status",
      "Capture package photos",
      "Record package conditions",
      "Access mobile interface"
    ];
    roles: ["warehouse_worker", "supervisor", "manager"];
  };
  
  admin: {
    description: "System administrators";
    permissions: ["Full system access", "User management", "System configuration"];
  };
}

// ==================== CORE FEATURES ====================
interface CoreFeatures {
  orderManagement: {
    description: "End-to-end package tracking from arrival to delivery";
    statuses: [
      "incoming", // Package heading to warehouse
      "arrived_at_warehouse", // Arrived and scanned in
      "packed", // Ready for shipping
      "awaiting_pickup", // Ready for courier
      "in_transit", // With courier
      "delivered" // Completed
    ];
    capabilities: [
      "Real-time status updates",
      "Photo documentation",
      "Damage assessment",
      "Dimension calculation",
      "Weight verification"
    ];
  };
  
  warehouseOperations: {
    description: "Physical warehouse management and staff coordination";
    features: [
      "Staff management with invite codes",
      "Mobile barcode scanning",
      "Operating hours configuration",
      "Capacity management",
      "Activity tracking"
    ];
    scanning: {
      technology: "@zxing/browser"; // Barcode scanning
      capabilities: ["QR codes", "Barcodes", "Real-time scanning"];
    };
  };
  
  emailProcessing: {
    description: "Automated email forwarding for shipping confirmations";
    workflow: [
      "Generate unique email address per customer (cust-123@domain.com)",
      "Receive shipping emails via Mailgun webhook",
      "Extract tracking numbers and order data",
      "Forward legitimate emails to customer's real email",
      "Filter spam and non-shipping emails"
    ];
  };
  
  packageVerification: {
    description: "Computer vision-based package condition assessment";
    technology: "OpenCV.js"; // Client-side image processing
    process: [
      "Dual photo capture (front + side)",
      "Ruler detection for scale reference",
      "Automatic dimension calculation",
      "Damage detection and assessment",
      "Before/after comparison for handover"
    ];
  };
  
  shippingManagement: {
    description: "Multi-courier shipping with dynamic rates";
    courierIntegrations: ["DHL", "UPS", "FedEx", "Local couriers"];
    features: [
      "Zone-based shipping rates",
      "Weight slab pricing",
      "Consolidated shipping options",
      "Automated label generation",
      "Tracking integration"
    ];
  };
  
  analytics: {
    description: "Business intelligence and reporting";
    metrics: [
      "Order volume trends",
      "Staff performance",
      "Capacity utilization",
      "Revenue tracking",
      "Customer satisfaction"
    ];
  };
}

// ==================== ARCHITECTURE ====================
interface Architecture {
  pattern: "Full-stack React Router v7 with Convex backend";
  
  routing: {
    structure: "File-based routing with layouts";
    layouts: [
      "app/routes/customer/layout.tsx", // Customer portal
      "app/routes/forwarder/layout.tsx", // Forwarder dashboard  
      "app/routes/staff/layout.tsx", // Mobile staff interface
      "app/routes/dashboard/layout.tsx" // Admin/general dashboard
    ];
    protection: "Clerk authentication with role-based routing";
  };
  
  stateManagement: {
    server: "Convex mutations and queries";
    client: "React state + Convex real-time subscriptions";
    auth: "Clerk authentication context";
  };
  
  dataFlow: {
    reads: "Convex queries with real-time updates";
    writes: "Convex mutations with optimistic updates";
    files: "Convex file storage for images/documents";
  };
  
  componentStructure: {
    ui: "Reusable shadcn/ui components in app/components/ui/";
    business: "Feature-specific components organized by domain";
    layout: "Shared layout components for navigation";
  };
}

// ==================== DATABASE SCHEMA ====================
interface DatabaseSchema {
  coreEntities: {
    users: {
      purpose: "Clerk user data with role-based permissions";
      roles: ["customer", "forwarder", "admin"];
      relationships: ["forwarders", "staff", "orders"];
    };
    
    orders: {
      purpose: "Package tracking from creation to delivery";
      keyFields: ["trackingNumber", "status", "customerId", "forwarderId"];
      statusFlow: "incoming → arrived_at_warehouse → packed → awaiting_pickup → in_transit → delivered";
    };
    
    forwarders: {
      purpose: "Business profiles for forwarding companies";
      features: ["operatingHours", "parcelLimits", "timezone"];
      relationships: ["warehouses", "staff", "orders"];
    };
    
    warehouses: {
      purpose: "Physical locations managed by forwarders";
      capabilities: ["capacity tracking", "operating hours", "service areas"];
    };
    
    staff: {
      purpose: "Warehouse workers with role-based permissions";
      roles: ["warehouse_worker", "supervisor", "manager"];
      permissions: ["canUpdateOrderStatus", "canPrintLabels", "canScanBarcodes"];
    };
  };
  
  operationalTables: {
    orderStatusHistory: "Audit trail for all status changes";
    staffActivity: "Performance tracking and activity logs";
    parcelConditions: "Photo documentation and damage assessment";
    shippingLabels: "Courier integration and label management";
    trackingEvents: "Real-time tracking updates from couriers";
  };
  
  configurationTables: {
    shippingZones: "Geographic service areas";
    shippingRates: "Hierarchical pricing (zone → courier → service → weight)";
    courierIntegrations: "API credentials and settings";
    warehouseServiceAreas: "Geographic coverage per warehouse";
  };
  
  communicationTables: {
    emailMessages: "Processed shipping confirmations";
    customerEmailAddresses: "Generated forwarding addresses";
    customerNotifications: "System alerts and updates";
  };
}

// ==================== INTEGRATIONS ====================
interface Integrations {
  authentication: {
    provider: "Clerk";
    features: ["SSO", "User management", "Role-based access"];
    implementation: "@clerk/react-router";
  };
  
  payments: {
    provider: "Polar.sh";
    features: ["Subscription billing", "Webhook handling", "Customer portal"];
    webhooks: "app/routes/api/webhooks/polar.ts";
  };
  
  email: {
    provider: "Mailgun";
    purpose: "Email forwarding and processing";
    webhooks: "app/routes/api/webhooks/mailgun.ts";
    processing: "convex/emailMatching.ts";
  };
  
  maps: {
    provider: "Google Places API";
    purpose: "Address autocomplete and validation";
    endpoints: [
      "app/routes/api/places/autocomplete.ts",
      "app/routes/api/places/details.ts"
    ];
  };
  
  ai: {
    provider: "OpenAI";
    features: ["Chat interface", "Email processing assistance"];
    implementation: "@ai-sdk/openai";
  };
  
  courierAPIs: {
    supported: ["DHL", "UPS", "FedEx"];
    purpose: "Label generation and tracking";
    configuration: "courierIntegrations table";
  };
  
  computerVision: {
    library: "OpenCV.js";
    purpose: "Package dimension calculation and damage detection";
    implementation: "Client-side processing in parcel components";
  };
}

// ==================== DEPLOYMENT ====================
interface Deployment {
  primary: {
    platform: "Vercel";
    configuration: "react-router.config.ts with @vercel/react-router preset";
    features: ["Automatic deployments", "Environment variables", "Edge functions"];
  };
  
  alternative: {
    method: "Docker containerization";
    file: "Dockerfile";
    targets: ["AWS ECS", "Google Cloud Run", "Azure Container Apps"];
  };
  
  environmentVariables: {
    required: [
      "CONVEX_DEPLOYMENT", // Convex backend URL
      "VITE_CONVEX_URL", // Convex client URL  
      "VITE_CLERK_PUBLISHABLE_KEY", // Clerk auth
      "CLERK_SECRET_KEY",
      "POLAR_ACCESS_TOKEN", // Payments
      "POLAR_ORGANIZATION_ID",
      "POLAR_WEBHOOK_SECRET",
      "OPENAI_API_KEY", // AI features
      "MAILGUN_API_KEY", // Email processing
      "GOOGLE_PLACES_API_KEY" // Address validation
    ];
  };
  
  buildProcess: {
    development: "npm run dev"; // React Router dev server
    production: "npm run build"; // Static generation + SSR
    typeCheck: "npm run typecheck"; // TypeScript validation
  };
}

// ==================== KEY INSIGHTS ====================
export const KEY_INSIGHTS = {
  businessDomain: "This is a sophisticated B2B logistics platform that bridges the gap between customers needing international package forwarding and forwarders providing warehouse services.",
  
  technicalComplexity: "High - involves real-time data sync, computer vision, multiple API integrations, role-based access control, and complex business logic.",
  
  scalabilityFactors: [
    "Convex provides real-time subscriptions for live updates",
    "Modular component architecture allows feature expansion", 
    "Docker support enables flexible deployment",
    "API-first design supports mobile and third-party integrations"
  ],
  
  criticalWorkflows: [
    "Package arrival → scanning → status updates → delivery",
    "Email processing → forwarding → order matching",
    "Staff management → permissions → activity tracking",
    "Rate calculation → label generation → tracking"
  ],
  
  uniqueFeatures: [
    "Dual-photo package verification with OpenCV",
    "Automated email forwarding with spam detection",
    "Role-based mobile scanning interface",
    "Hierarchical shipping rate management"
  ],
  
  developmentPriorities: [
    "Real-time status updates are critical for user experience",
    "Photo quality and damage detection affect liability",
    "Staff productivity directly impacts forwarder profitability",
    "Email processing accuracy affects customer trust"
  ]
} as const;

// ==================== CURRENT STATE ANALYSIS ====================
export const CURRENT_STATE = {
  implementation: "Production-ready foundation with core features implemented",
  
  completedFeatures: [
    "User authentication and role management",
    "Basic order tracking and status updates", 
    "Warehouse and staff management",
    "Email processing infrastructure",
    "Package photo capture",
    "Shipping rate configuration",
    "Mobile scanner interface"
  ],
  
  inDevelopment: [
    "Advanced analytics dashboard",
    "Courier API integrations", 
    "Package consolidation logic",
    "Advanced damage detection"
  ],
  
  technicalDebt: [
    "Some database queries need optimization",
    "Error handling could be more robust",
    "Test coverage needs improvement",
    "Documentation could be more comprehensive"
  ],
  
  scalingConsiderations: [
    "Image storage and processing at scale",
    "Real-time updates with many concurrent users",
    "Complex rate calculations with multiple variables",
    "International compliance and regulations"
  ]
} as const;

/**
 * SUMMARY
 * 
 * This is a comprehensive B2B logistics platform built with modern React and serverless architecture.
 * It handles the complete lifecycle of package forwarding operations, from customer orders to final delivery.
 * 
 * The system is designed for three primary user types:
 * 1. Customers - who need packages forwarded internationally
 * 2. Forwarders - who operate warehouses and provide shipping services  
 * 3. Staff - who handle the physical operations in warehouses
 * 
 * Key technical highlights:
 * - Real-time updates via Convex subscriptions
 * - Computer vision for package verification
 * - Email processing with AI-powered extraction
 * - Multi-courier shipping integrations
 * - Role-based mobile interfaces
 * 
 * The codebase is well-structured with clear separation of concerns, making it maintainable
 * and extensible for future feature development.
 */