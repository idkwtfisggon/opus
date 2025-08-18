import type { Route } from "./+types/autocomplete";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyDepvSDx1JvevY4e-crsvBNBqiEYetW4Vg';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const input = url.searchParams.get('input');
  const sessiontoken = url.searchParams.get('sessiontoken');
  const countryBias = url.searchParams.get('components');

  if (!input || input.length < 3) {
    return Response.json({ predictions: [] });
  }

  try {
    const params = new URLSearchParams({
      input: input.trim(),
      key: GOOGLE_PLACES_API_KEY,
      types: 'address',
      language: 'en',
    });

    if (sessiontoken) {
      params.append('sessiontoken', sessiontoken);
    }

    if (countryBias) {
      params.append('components', countryBias);
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Error in places autocomplete API:', error);
    return Response.json(
      { error: 'Failed to fetch address suggestions' },
      { status: 500 }
    );
  }
}