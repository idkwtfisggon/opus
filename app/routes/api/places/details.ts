import type { Route } from "./+types/details";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const placeId = url.searchParams.get('place_id');
  const sessiontoken = url.searchParams.get('sessiontoken');

  if (!GOOGLE_PLACES_API_KEY) {
    console.error('Google Places API key is not configured');
    return Response.json(
      { error: 'Google Places API not configured' },
      { status: 500 }
    );
  }

  if (!placeId) {
    return Response.json(
      { error: 'place_id parameter is required' },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      place_id: placeId,
      key: GOOGLE_PLACES_API_KEY,
      fields: 'address_components,formatted_address,place_id',
      language: 'en',
    });

    if (sessiontoken) {
      params.append('sessiontoken', sessiontoken);
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Log the response for debugging
    if (data.status !== 'OK') {
      console.error('Google Places Details API error:', data);
    }
    
    return Response.json(data);
  } catch (error) {
    console.error('Error in places details API:', error);
    return Response.json(
      { error: 'Failed to fetch place details' },
      { status: 500 }
    );
  }
}