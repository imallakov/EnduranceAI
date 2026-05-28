import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMarathons } from '../api/marathons';
import { createPrediction, getPredictions, getLatestPrediction } from '../api/predictions';
import type { Marathon, Prediction, PredictionRequest, PredictionResponse } from '../types/api';

export function useMarathons() {
  return useQuery<Marathon[]>({
    queryKey: ['marathons'],
    queryFn: getMarathons,
    staleTime: 1000 * 60 * 60,
    // Catalog data doesn't change between tab switches — avoid the loading
    // flash users saw when refocusing the window.
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useLatestPrediction() {
  return useQuery<Prediction | null>({
    queryKey: ['predictions', 'latest'],
    queryFn: getLatestPrediction,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePredictionsHistory() {
  return useQuery<Prediction[]>({
    queryKey: ['predictions', 'list'],
    queryFn: getPredictions,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreatePrediction() {
  const qc = useQueryClient();
  return useMutation<PredictionResponse, Error, PredictionRequest>({
    mutationFn: createPrediction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['predictions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
