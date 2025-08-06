# Project Correspondence Notes

## Project Overview
Building "Uber for Logistics" - A platform connecting shops that don't ship internationally with forwarders worldwide through a Chrome extension.

## Core Business Model
- **Shops**: Don't ship internationally, need forwarding services
- **Forwarders**: Receive packages, consolidate, and ship to customers worldwide
- **Customers**: Want to buy from shops that don't ship to their country
- **Chrome Extension**: Integration point for shops and customers

## Tech Stack
- **Frontend**: React Router 7 (full-stack framework with SSR)
- **Database**: Convex (real-time database and backend)
- **Auth**: Clerk (role-based: customer, forwarder, admin)
- **Styling**: Tailwind CSS with Apple-inspired design system
- **UI Components**: Radix UI with custom design tokens
- **Deployment**: Convex deployment

## Key Decisions Made

### **Order Status Workflow (EXACT TERMS)**
1. **Incoming** → Package heading to warehouse
2. **Arrived on Premises** → Package received at warehouse  
3. **Packed** → Package packed and labeled
4. **Awaiting Pickup** → Ready for courier collection
5. **Delivery in Progress** → Courier collected, in transit
6. **Arrived at Destination** → Final delivery

### **Shipping Types**
- **Immediate**: Customer wants package shipped ASAP when it arrives
- **Consolidated**: Customer wants package held and shipped with other purchases

### **Courier Assignment Logic**
- **DECISION**: Customer pre-assigns courier during order creation (NOT forwarder)
- **Rationale**: Transparency, pricing clarity, customer choice, simpler forwarder workflow
- **Implementation**: Courier field is read-only for forwarders, pre-populated from customer choice

### **Print Label Logic**
- **Requirements**: 
  1. Order status = "Arrived on Premises" 
  2. Courier must be assigned (customer pre-assigned)
- **Only then**: Print Label button becomes active
- **After printing**: Status can be updated to "Packed"

## Database Schema

### **Users Table**
- Basic user info with role-based access (customer/forwarder/admin)
- Clerk integration for authentication

### **Forwarders Table**
- Business profile information
- Links to Users table via userId
- Business details for operations

### **Warehouses Table**
- Physical locations for forwarders
- Capacity management (current/max parcels, weight limits)
- Multiple warehouses per forwarder supported

### **Orders Table**
- Complete order lifecycle tracking
- Customer info, merchant details, package info
- Status workflow with timestamps
- Courier assignment (customer-controlled)
- Shipping type selection
- Label printing tracking

### **OrderHistory Table**
- Audit trail for all status changes
- Tracks who made changes and when
- Notes for context

## UI/UX Design System

### **Apple-Inspired Design**
- **Colors**: Using CSS custom properties for semantic colors
- **Typography**: San Francisco font stack, consistent sizing
- **Spacing**: Consistent gap/padding system
- **Components**: Rounded corners, subtle shadows, smooth transitions
- **Interactive States**: Proper hover/focus/disabled states

### **Dashboard Features**
- **Smart Alert Cards**: Color-coded priority system (red/yellow/green)
  - Unassigned Couriers, Pending Labels, Stale Orders, Capacity Usage
- **Status Management**: Editable dropdowns with color-coded badges
- **Action Buttons**: Context-aware based on order state
- **Professional Sidebar**: Navigation with icons and hover states

## Current Implementation Status

### **✅ Completed**
1. Forwarder onboarding system with JWT authentication
2. Database schema with all required tables
3. Dashboard with smart alert cards and stats
4. Order management table with all required columns
5. Status management with exact terminology
6. UI/UX standardization with Apple design system
7. Courier assignment logic (customer-controlled)

### **🚧 In Progress**
- Order management system refinements
- Print label functionality implementation

### **📋 Pending**
- Label printing functionality with courier API integration
- Customer dashboard and order creation flow
- Chrome extension development
- Analytics and volume tracking
- Bulk operations (status updates, courier management)
- Real-time notifications and updates

## Important Notes

### **API Integrations Needed**
- **DHL API**: Label printing, tracking updates
- **UPS API**: Label printing, tracking updates  
- **FedEx API**: Label printing, tracking updates
- **Other Couriers**: SF Express, local couriers

### **Future Customer Dashboard**
- Order creation with courier selection
- Shipping type selection (immediate/consolidated)
- Real-time tracking updates
- Communication with forwarders

### **Chrome Extension Features**
- Shop integration for international customers
- Price comparison across forwarders
- Seamless checkout experience

## User Feedback & Preferences
- **User prefers**: Step-by-step implementation over large features
- **User prefers**: Being consulted before major changes
- **User wants**: Good UI/UX improvements over previous Shibubu app
- **User location**: Singapore (important for testing, local couriers)

## Development Approach
- Break down features into small, manageable phases
- Test each phase before moving to next
- Prioritize core workflow over advanced features
- Focus on forwarder dashboard first, then expand to other user types

---
*This file should be referenced when resuming work or when context is lost due to conversation limits.*