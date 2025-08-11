import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get service areas for a forwarder's warehouses
export const getForwarderServiceAreas = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Get forwarder
    const forwarder = await ctx.db
      .query("forwarders")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!forwarder) return null;

    // Get all warehouses for this forwarder
    const warehouses = await ctx.db
      .query("warehouses")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarder._id))
      .collect();

    // Get service areas for each warehouse
    const warehousesWithServiceAreas = await Promise.all(
      warehouses.map(async (warehouse) => {
        const serviceAreas = await ctx.db
          .query("warehouseServiceAreas")
          .withIndex("by_warehouse", (q) => q.eq("warehouseId", warehouse._id))
          .collect();

        return {
          ...warehouse,
          serviceAreas
        };
      })
    );

    return {
      forwarder,
      warehouses: warehousesWithServiceAreas
    };
  },
});

// Create or update service area for a warehouse
export const updateWarehouseServiceArea = mutation({
  args: {
    warehouseId: v.string(),
    coverage: v.array(v.object({
      country: v.string(),
      countryCode: v.string(),
      states: v.optional(v.array(v.string())),
      stateCodes: v.optional(v.array(v.string())),
      isFullCountry: v.boolean(),
      priority: v.number(),
    })),
    handlingTimeHours: v.number(),
    additionalFees: v.optional(v.number()),
    specialInstructions: v.optional(v.string()),
    maxPackagesPerDay: v.optional(v.number()),
    useCustomRates: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify warehouse belongs to this forwarder
    const warehouse = await ctx.db.get(args.warehouseId as any);
    if (!warehouse) throw new Error("Warehouse not found");

    const forwarder = await ctx.db
      .query("forwarders")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!forwarder || (warehouse as any).forwarderId !== forwarder._id) {
      throw new Error("Unauthorized");
    }

    // Check if service area already exists for this warehouse
    const existingServiceArea = await ctx.db
      .query("warehouseServiceAreas")
      .withIndex("by_warehouse", (q) => q.eq("warehouseId", args.warehouseId))
      .unique();

    if (existingServiceArea) {
      // Update existing
      await ctx.db.patch(existingServiceArea._id, {
        coverage: args.coverage,
        handlingTimeHours: args.handlingTimeHours,
        additionalFees: args.additionalFees,
        specialInstructions: args.specialInstructions,
        maxPackagesPerDay: args.maxPackagesPerDay,
        useCustomRates: args.useCustomRates,
        updatedAt: Date.now(),
      });
      return existingServiceArea._id;
    } else {
      // Create new
      return await ctx.db.insert("warehouseServiceAreas", {
        warehouseId: args.warehouseId,
        coverage: args.coverage,
        handlingTimeHours: args.handlingTimeHours,
        additionalFees: args.additionalFees,
        specialInstructions: args.specialInstructions,
        maxPackagesPerDay: args.maxPackagesPerDay,
        useCustomRates: args.useCustomRates,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Find warehouses that can serve a specific origin location
export const findWarehousesForOrigin = query({
  args: {
    originCountry: v.string(),
    originCountryCode: v.string(),
    originState: v.optional(v.string()),
    sortBy: v.optional(v.union(v.literal("distance"), v.literal("price"), v.literal("speed"))),
  },
  handler: async (ctx, args) => {
    // Get all active service areas
    const serviceAreas = await ctx.db
      .query("warehouseServiceAreas")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter service areas that match the origin location
    const matchingServiceAreas = serviceAreas.filter(serviceArea => {
      return serviceArea.coverage.some(coverage => {
        // Exact country match
        if (coverage.countryCode === args.originCountryCode) {
          // If warehouse serves full country, it matches
          if (coverage.isFullCountry) return true;
          
          // If specific states are defined and we have an origin state
          if (args.originState && coverage.states) {
            return coverage.states.includes(args.originState);
          }
          
          // If no origin state provided but warehouse has state restrictions,
          // still show it (customer can refine later)
          return true;
        }
        return false;
      });
    });

    // Get warehouse details for each matching service area
    const warehousesWithDetails = await Promise.all(
      matchingServiceAreas.map(async (serviceArea) => {
        const warehouse = await ctx.db.get(serviceArea.warehouseId);
        if (!warehouse) return null;

        const forwarder = await ctx.db.get(warehouse.forwarderId);
        if (!forwarder) return null;

        // Find the coverage that matches this origin
        const matchingCoverage = serviceArea.coverage.find(coverage => 
          coverage.countryCode === args.originCountryCode
        );

        return {
          warehouse,
          forwarder,
          serviceArea,
          matchingCoverage,
          priority: matchingCoverage?.priority || 999,
        };
      })
    );

    // Filter out null results and sort
    const validWarehouses = warehousesWithDetails.filter(Boolean);

    // Sort based on criteria
    if (args.sortBy === "speed") {
      validWarehouses.sort((a, b) => a.serviceArea.handlingTimeHours - b.serviceArea.handlingTimeHours);
    } else if (args.sortBy === "price") {
      // Will need to integrate with shipping rates - for now sort by additional fees
      validWarehouses.sort((a, b) => (a.serviceArea.additionalFees || 0) - (b.serviceArea.additionalFees || 0));
    } else {
      // Default: sort by priority (1=primary area first), then by handling time
      validWarehouses.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.serviceArea.handlingTimeHours - b.serviceArea.handlingTimeHours;
      });
    }

    return validWarehouses;
  },
});

// Get available countries and states for service area setup
export const getAvailableRegions = query({
  handler: async (ctx) => {
    const regions = await ctx.db
      .query("geographicRegions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return regions.map(region => ({
      country: region.country,
      countryCode: region.countryCode,
      continent: region.continent,
      states: region.states
    }));
  },
});

// Seed geographic regions data (run once)
export const seedGeographicRegions = mutation({
  handler: async (ctx) => {
    // Only run if no regions exist
    const existingRegions = await ctx.db.query("geographicRegions").collect();
    if (existingRegions.length > 0) {
      return "Geographic regions already exist";
    }

    const regions = [
      {
        country: "France",
        countryCode: "FR",
        continent: "Europe",
        states: [
          { name: "Île-de-France", code: "IDF", majorCities: ["Paris", "Versailles"] },
          { name: "Provence-Alpes-Côte d'Azur", code: "PACA", majorCities: ["Marseille", "Nice", "Cannes"] },
          { name: "Occitanie", code: "OCC", majorCities: ["Toulouse", "Montpellier"] },
          { name: "Nouvelle-Aquitaine", code: "NAQ", majorCities: ["Bordeaux"] },
          { name: "Auvergne-Rhône-Alpes", code: "ARA", majorCities: ["Lyon", "Grenoble"] },
          { name: "Hauts-de-France", code: "HDF", majorCities: ["Lille"] },
          { name: "Grand Est", code: "GES", majorCities: ["Strasbourg", "Nancy"] },
          { name: "Pays de la Loire", code: "PDL", majorCities: ["Nantes"] },
          { name: "Bretagne", code: "BRE", majorCities: ["Rennes"] },
          { name: "Normandie", code: "NOR", majorCities: ["Rouen", "Caen"] },
        ],
        isActive: true,
        createdAt: Date.now(),
      },
      {
        country: "United States",
        countryCode: "US",
        continent: "North America", 
        states: [
          { name: "California", code: "CA", majorCities: ["Los Angeles", "San Francisco", "San Diego"] },
          { name: "New York", code: "NY", majorCities: ["New York City", "Albany", "Buffalo"] },
          { name: "Texas", code: "TX", majorCities: ["Houston", "Dallas", "Austin"] },
          { name: "Florida", code: "FL", majorCities: ["Miami", "Orlando", "Tampa"] },
          { name: "Illinois", code: "IL", majorCities: ["Chicago"] },
          { name: "Nevada", code: "NV", majorCities: ["Las Vegas", "Reno"] },
          { name: "Washington", code: "WA", majorCities: ["Seattle", "Spokane"] },
          { name: "Oregon", code: "OR", majorCities: ["Portland"] },
        ],
        isActive: true,
        createdAt: Date.now(),
      },
      {
        country: "Germany",
        countryCode: "DE",
        continent: "Europe",
        states: [
          { name: "Bavaria", code: "BY", majorCities: ["Munich", "Nuremberg"] },
          { name: "North Rhine-Westphalia", code: "NW", majorCities: ["Cologne", "Düsseldorf", "Dortmund"] },
          { name: "Baden-Württemberg", code: "BW", majorCities: ["Stuttgart", "Mannheim"] },
          { name: "Berlin", code: "BE", majorCities: ["Berlin"] },
          { name: "Hamburg", code: "HH", majorCities: ["Hamburg"] },
        ],
        isActive: true,
        createdAt: Date.now(),
      },
      {
        country: "United Kingdom",
        countryCode: "GB",
        continent: "Europe",
        states: [
          { name: "England", code: "ENG", majorCities: ["London", "Manchester", "Birmingham"] },
          { name: "Scotland", code: "SCT", majorCities: ["Edinburgh", "Glasgow"] },
          { name: "Wales", code: "WLS", majorCities: ["Cardiff", "Swansea"] },
          { name: "Northern Ireland", code: "NIR", majorCities: ["Belfast"] },
        ],
        isActive: true,
        createdAt: Date.now(),
      },
      {
        country: "Canada",
        countryCode: "CA",
        continent: "North America",
        states: [
          { name: "Ontario", code: "ON", majorCities: ["Toronto", "Ottawa"] },
          { name: "Quebec", code: "QC", majorCities: ["Montreal", "Quebec City"] },
          { name: "British Columbia", code: "BC", majorCities: ["Vancouver", "Victoria"] },
          { name: "Alberta", code: "AB", majorCities: ["Calgary", "Edmonton"] },
          { name: "Manitoba", code: "MB", majorCities: ["Winnipeg"] },
          { name: "Saskatchewan", code: "SK", majorCities: ["Regina", "Saskatoon"] },
        ],
        isActive: true,
        createdAt: Date.now(),
      },
      {
        country: "Australia",
        countryCode: "AU",
        continent: "Oceania",
        states: [
          { name: "New South Wales", code: "NSW", majorCities: ["Sydney", "Newcastle"] },
          { name: "Victoria", code: "VIC", majorCities: ["Melbourne", "Geelong"] },
          { name: "Queensland", code: "QLD", majorCities: ["Brisbane", "Gold Coast"] },
          { name: "Western Australia", code: "WA", majorCities: ["Perth"] },
          { name: "South Australia", code: "SA", majorCities: ["Adelaide"] },
          { name: "Tasmania", code: "TAS", majorCities: ["Hobart"] },
        ],
        isActive: true,
        createdAt: Date.now(),
      },
      {
        country: "Japan",
        countryCode: "JP",
        continent: "Asia",
        states: [
          { name: "Tokyo", code: "13", majorCities: ["Tokyo", "Shibuya", "Shinjuku"] },
          { name: "Osaka", code: "27", majorCities: ["Osaka", "Sakai"] },
          { name: "Kanagawa", code: "14", majorCities: ["Yokohama", "Kawasaki"] },
          { name: "Aichi", code: "23", majorCities: ["Nagoya"] },
          { name: "Kyoto", code: "26", majorCities: ["Kyoto"] },
          { name: "Hokkaido", code: "01", majorCities: ["Sapporo"] },
        ],
        isActive: true,
        createdAt: Date.now(),
      },
      {
        country: "Singapore",
        countryCode: "SG",
        continent: "Asia",
        states: [
          { name: "Central Region", code: "CR", majorCities: ["Singapore City"] },
          { name: "East Region", code: "ER", majorCities: ["Bedok", "Tampines"] },
          { name: "North Region", code: "NR", majorCities: ["Woodlands", "Yishun"] },
          { name: "Northeast Region", code: "NER", majorCities: ["Ang Mo Kio", "Serangoon"] },
          { name: "West Region", code: "WR", majorCities: ["Jurong", "Choa Chu Kang"] },
        ],
        isActive: true,
        createdAt: Date.now(),
      },
      {
        country: "Netherlands",
        countryCode: "NL",
        continent: "Europe",
        states: [
          { name: "North Holland", code: "NH", majorCities: ["Amsterdam", "Haarlem"] },
          { name: "South Holland", code: "ZH", majorCities: ["The Hague", "Rotterdam"] },
          { name: "Utrecht", code: "UT", majorCities: ["Utrecht"] },
          { name: "North Brabant", code: "NB", majorCities: ["Eindhoven", "Tilburg"] },
        ],
        isActive: true,
        createdAt: Date.now(),
      },
      {
        country: "Spain",
        countryCode: "ES",
        continent: "Europe",
        states: [
          { name: "Madrid", code: "MD", majorCities: ["Madrid"] },
          { name: "Catalonia", code: "CT", majorCities: ["Barcelona", "Girona"] },
          { name: "Andalusia", code: "AN", majorCities: ["Seville", "Málaga"] },
          { name: "Valencia", code: "VC", majorCities: ["Valencia", "Alicante"] },
          { name: "Basque Country", code: "PV", majorCities: ["Bilbao", "San Sebastián"] },
        ],
        isActive: true,
        createdAt: Date.now(),
      },
      {
        country: "Italy",
        countryCode: "IT",
        continent: "Europe",
        states: [
          { name: "Lombardy", code: "LO", majorCities: ["Milan", "Bergamo"] },
          { name: "Lazio", code: "LA", majorCities: ["Rome"] },
          { name: "Campania", code: "CA", majorCities: ["Naples", "Salerno"] },
          { name: "Veneto", code: "VE", majorCities: ["Venice", "Verona"] },
          { name: "Sicily", code: "SI", majorCities: ["Palermo", "Catania"] },
        ],
        isActive: true,
        createdAt: Date.now(),
      }
    ];

    for (const region of regions) {
      await ctx.db.insert("geographicRegions", region);
    }

    return `Seeded ${regions.length} geographic regions`;
  },
});

// Toggle service area active status
export const toggleServiceAreaStatus = mutation({
  args: {
    warehouseId: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify ownership
    const warehouse = await ctx.db.get(args.warehouseId);
    if (!warehouse) throw new Error("Warehouse not found");

    const forwarder = await ctx.db
      .query("forwarders")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!forwarder || (warehouse as any).forwarderId !== forwarder._id) {
      throw new Error("Unauthorized");
    }

    const serviceArea = await ctx.db
      .query("warehouseServiceAreas")
      .withIndex("by_warehouse", (q) => q.eq("warehouseId", args.warehouseId))
      .unique();

    if (serviceArea) {
      await ctx.db.patch(serviceArea._id, {
        isActive: args.isActive,
        updatedAt: Date.now(),
      });
    }

    return serviceArea?._id;
  },
});