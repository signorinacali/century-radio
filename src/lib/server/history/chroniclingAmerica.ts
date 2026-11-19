import type { IngestedFact } from './wikimedia';

/**
 * Legacy Chronicling America adapter kept as a clean no-op stub because
 * chroniclingamerica.loc.gov now 308-redirects to Cloudflare-gated www.loc.gov.
 */
export async function fetchChroniclingAmerica(_isoDate: string): Promise<IngestedFact[]> {
	return [];
}
