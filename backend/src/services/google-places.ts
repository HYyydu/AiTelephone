import { fetch } from "undici";
import { config } from "../config";

export interface ClinicSearchResult {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance?: string;
}

interface GooglePlacesSearchResponse {
  status: string;
  results: Array<{
    place_id: string;
    name: string;
    formatted_address?: string;
    vicinity?: string;
    rating?: number;
    user_ratings_total?: number;
    business_status?: string;
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
  }>;
  error_message?: string;
}

interface GooglePlaceDetailsResponse {
  status: string;
  result?: {
    international_phone_number?: string;
    formatted_phone_number?: string;
  };
  error_message?: string;
}

const QUOTE_TYPE_KEYWORDS: Record<string, string> = {
  vet_clinic: "veterinary clinic",
  dental: "dental clinic",
  dentist: "dentist",
  hospital: "hospital",
  urgent_care: "urgent care",
  default: config.googlePlaces.defaultKeyword || "clinic",
};

const MAX_DETAILS_LOOKUPS = 5;

export function buildPlacesCacheKey(
  location: string,
  quoteType?: string,
): string {
  const normalizedLocation = location.trim().toLowerCase();
  const normalizedType = (quoteType || "default").toLowerCase();
  return `${normalizedType}:${normalizedLocation}`;
}

export class GooglePlacesService {
  private apiKey: string;
  private textSearchUrl: string;
  private detailsUrl: string;

  constructor() {
    this.apiKey = config.googlePlaces.apiKey;
    this.textSearchUrl = config.googlePlaces.textSearchUrl;
    this.detailsUrl = config.googlePlaces.detailsUrl;
  }

  private buildQuery(location: string, quoteType?: string): string {
    const keyword =
      (quoteType && QUOTE_TYPE_KEYWORDS[quoteType]) ||
      QUOTE_TYPE_KEYWORDS.default;
    return `${keyword} near ${location}`;
  }

  private async fetchPlaceDetails(
    placeId: string,
  ): Promise<string | undefined> {
    const detailsUrl = new URL(this.detailsUrl);
    detailsUrl.searchParams.set("place_id", placeId);
    detailsUrl.searchParams.set(
      "fields",
      "international_phone_number,formatted_phone_number",
    );
    detailsUrl.searchParams.set("key", this.apiKey);

    try {
      const response = await fetch(detailsUrl);
      const data = (await response.json()) as GooglePlaceDetailsResponse;

      if (data.status !== "OK" || !data.result) {
        return undefined;
      }

      return (
        data.result.international_phone_number ||
        data.result.formatted_phone_number
      );
    } catch (error) {
      console.warn("⚠️  Failed to fetch Google Place details:", error);
      return undefined;
    }
  }

  async searchClinics(params: {
    location: string;
    quoteType?: string;
  }): Promise<{ cacheKey: string; clinics: ClinicSearchResult[] }> {
    if (!this.apiKey) {
      throw new Error("Missing GOOGLE_MAPS_API_KEY");
    }

    const { location, quoteType } = params;
    const searchUrl = new URL(this.textSearchUrl);
    searchUrl.searchParams.set("key", this.apiKey);
    searchUrl.searchParams.set("query", this.buildQuery(location, quoteType));
    searchUrl.searchParams.set(
      "radius",
      config.googlePlaces.radiusMeters.toString(),
    );

    const response = await fetch(searchUrl);
    const data = (await response.json()) as GooglePlacesSearchResponse;

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(
        `Google Places error: ${data.status} ${
          data.error_message ? `- ${data.error_message}` : ""
        }`.trim(),
      );
    }

    const clinics: ClinicSearchResult[] = (data.results || []).map(
      (result) => ({
        id: result.place_id,
        name: result.name,
        address:
          result.formatted_address || result.vicinity || "Address unknown",
        phone: "",
      }),
    );

    // Fetch phone numbers for the first few results to stay within quota.
    const detailTargets = clinics.slice(0, MAX_DETAILS_LOOKUPS);
    const phoneNumbers = await Promise.all(
      detailTargets.map(async (clinic) => {
        const phone = await this.fetchPlaceDetails(clinic.id);
        return { id: clinic.id, phone };
      }),
    );
    const phoneById = new Map(
      phoneNumbers
        .filter((entry) => Boolean(entry.phone))
        .map((entry) => [entry.id, entry.phone as string]),
    );

    const enrichedClinics = clinics.map((clinic) => ({
      ...clinic,
      phone: phoneById.get(clinic.id) || clinic.phone,
    }));

    return {
      cacheKey: buildPlacesCacheKey(location, quoteType),
      clinics: enrichedClinics,
    };
  }
}
