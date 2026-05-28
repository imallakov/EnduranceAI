import { useMutation, useQueryClient } from '@tanstack/react-query';
import { previewGPX, createCustomMarathon, setTargetMarathon } from '../api/marathons';
import type { Marathon, MarathonPreviewResponse } from '../types/api';

export function usePreviewGPX() {
  return useMutation<MarathonPreviewResponse, Error, File>({
    mutationFn: previewGPX,
  });
}

export function useCreateCustomMarathon() {
  const qc = useQueryClient();
  return useMutation<
    Marathon,
    Error,
    { fields: { name: string; city: string; country: string; race_date?: string }; file: File }
  >({
    mutationFn: ({ fields, file }) => createCustomMarathon(fields, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marathons'] });
    },
  });
}

export function useSetTargetMarathon() {
  const qc = useQueryClient();
  return useMutation<void, Error, { marathonId: string; raceDate?: string | null }>({
    mutationFn: ({ marathonId, raceDate }) => setTargetMarathon(marathonId, raceDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['marathons'] });
    },
  });
}
