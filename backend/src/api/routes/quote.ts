// Quote API - schema, validation, script generation for get-a-quote flow
import { Router, Request, Response } from "express";
import {
  getSchema,
  getMissingRequired,
  isReadyToSearch,
  generateCallScript,
} from "../../quote";
import type { QuoteSlots } from "../../quote";
import { authenticateUser } from "../../utils/auth-middleware";
import {
  ClinicSearchResult,
  GooglePlacesService,
  buildPlacesCacheKey,
} from "../../services/google-places";
import { getCachedJson, setCachedJson } from "../../services/cache";

const router = Router();
const googlePlacesService = new GooglePlacesService();

// GET /api/quote/schema/:quoteType - return schema for a quote type
router.get(
  "/schema/:quoteType",
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { quoteType } = req.params;
      const schema = getSchema(quoteType);
      if (!schema) {
        res.status(404).json({
          success: false,
          error: `Unknown quote type: ${quoteType}`,
        });
        return;
      }
      res.json({ success: true, schema });
    } catch (error) {
      console.error("Quote schema error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  },
);

// POST /api/quote/validate - validate slots for a quote type
router.post(
  "/validate",
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { quoteType, slots } = req.body as {
        quoteType?: string;
        slots?: QuoteSlots;
      };
      if (!quoteType || typeof slots !== "object") {
        res.status(400).json({
          success: false,
          error: "quoteType and slots are required",
        });
        return;
      }
      const missing = getMissingRequired(quoteType, slots ?? {});
      const ready = isReadyToSearch(quoteType, slots ?? {});
      res.json({
        success: true,
        valid: ready,
        missingRequired: missing,
        readyToSearch: ready,
      });
    } catch (error) {
      console.error("Quote validate error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  },
);

// POST /api/quote/script - generate call script from slots
router.post(
  "/script",
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { quoteType, slots } = req.body as {
        quoteType?: string;
        slots?: QuoteSlots;
      };
      if (!quoteType || typeof slots !== "object") {
        res.status(400).json({
          success: false,
          error: "quoteType and slots are required",
        });
        return;
      }
      const script = generateCallScript(quoteType, slots ?? {});
      res.json({ success: true, script });
    } catch (error) {
      console.error("Quote script error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  },
);

// Mock clinics for a location - replace with Google Places / Maps API later
function getMockClinicsForLocation(location: string): ClinicSearchResult[] {
  const normalized = (location || "").trim().toLowerCase();
  // Zip 90024 = West LA area
  if (normalized === "90024" || normalized.includes("90024")) {
    return [
      {
        id: "mock-1",
        name: "West LA Veterinary Clinic",
        address: "11645 Wilshire Blvd, Los Angeles, CA 90024",
        phone: "+1 310 555 0101",
        distance: "0.5 mi",
      },
      {
        id: "mock-2",
        name: "Sawtelle Pet Hospital",
        address: "1840 Sawtelle Blvd, Los Angeles, CA 90025",
        phone: "+1 310 555 0102",
        distance: "1.2 mi",
      },
      {
        id: "mock-3",
        name: "Brentwood Animal Care",
        address: "11980 San Vicente Blvd, Los Angeles, CA 90049",
        phone: "+1 310 555 0103",
        distance: "2.0 mi",
      },
      {
        id: "mock-4",
        name: "Santa Monica Pet Clinic",
        address: "1234 Montana Ave, Santa Monica, CA 90403",
        phone: "+1 310 555 0104",
        distance: "2.8 mi",
      },
      {
        id: "mock-5",
        name: "Culver City Veterinary Group",
        address: "9300 Culver Blvd, Culver City, CA 90232",
        phone: "+1 310 555 0105",
        distance: "3.5 mi",
      },
    ];
  }
  // Generic mock for any other location
  return [
    {
      id: "mock-a",
      name: "Local Vet Clinic One",
      address: `123 Main St, ${location}`,
      phone: "+1 555 100 0001",
      distance: "0.3 mi",
    },
    {
      id: "mock-b",
      name: "Animal Care Center",
      address: `456 Oak Ave, ${location}`,
      phone: "+1 555 100 0002",
      distance: "0.8 mi",
    },
    {
      id: "mock-c",
      name: "Pet Hospital Plus",
      address: `789 Elm St, ${location}`,
      phone: "+1 555 100 0003",
      distance: "1.5 mi",
    },
    {
      id: "mock-d",
      name: "Neighborhood Veterinary",
      address: `321 Pine Rd, ${location}`,
      phone: "+1 555 100 0004",
      distance: "2.1 mi",
    },
    {
      id: "mock-e",
      name: "Family Pet Clinic",
      address: `654 Maple Dr, ${location}`,
      phone: "+1 555 100 0005",
      distance: "2.7 mi",
    },
  ];
}

// POST /api/quote/search - search clinics by location (mock for now; wire to Google Maps/Places later)
router.post(
  "/search",
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { location, quoteType } = req.body as {
        location?: string;
        quoteType?: string;
      };
      if (!location || typeof location !== "string" || !location.trim()) {
        res.status(400).json({
          success: false,
          error: "location is required",
        });
        return;
      }
      const normalizedLocation = location.trim();
      const cacheKey = buildPlacesCacheKey(normalizedLocation, quoteType);

      try {
        const cachedClinics = await getCachedJson<ClinicSearchResult[]>(
          cacheKey,
        );
        if (cachedClinics) {
          res.json({
            success: true,
            clinics: cachedClinics,
            count: cachedClinics.length,
            location: normalizedLocation,
            source: "cache",
          });
          return;
        }
      } catch (error) {
        console.warn("⚠️  Failed to read quote search cache:", error);
      }

      try {
        const { clinics } = await googlePlacesService.searchClinics({
          location: normalizedLocation,
          quoteType,
        });

        await setCachedJson(cacheKey, clinics);

        res.json({
          success: true,
          clinics,
          count: clinics.length,
          location: normalizedLocation,
          source: "google_places",
        });
        return;
      } catch (error) {
        console.warn(
          "⚠️  Google Places lookup failed, falling back to mock data:",
          error instanceof Error ? error.message : error,
        );
        const clinics = getMockClinicsForLocation(normalizedLocation);
        res.json({
          success: true,
          clinics,
          count: clinics.length,
          location: normalizedLocation,
          source: "mock",
        });
      }
    } catch (error) {
      console.error("Quote search error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  },
);

export default router;
