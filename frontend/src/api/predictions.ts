import { apiClient } from './client';
import type {
  Prediction, PredictionRequest, PredictionResponse, Paginated,
} from '../types/api';

export async function createPrediction(payload: PredictionRequest): Promise<PredictionResponse> {
  const { data } = await apiClient.post<PredictionResponse>('/api/predictions/', payload);
  return data;
}

// PredictionListView is DRF generics.ListAPIView → paginated response.
// Unwrap .results so callers can map() directly.
export async function getPredictions(): Promise<Prediction[]> {
  const { data } = await apiClient.get<Paginated<Prediction>>('/api/predictions/list/', {
    params: { page_size: 100 },
  });
  return data.results;
}

export async function getLatestPrediction(): Promise<Prediction | null> {
  try {
    const { data } = await apiClient.get<Prediction>('/api/predictions/latest/');
    return data;
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'response' in e) {
      const err = e as { response?: { status: number } };
      if (err.response?.status === 404) return null;
    }
    throw e;
  }
}

export async function getPrediction(id: string): Promise<Prediction> {
  const { data } = await apiClient.get<Prediction>(`/api/predictions/${id}/`);
  return data;
}
