import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioAsset } from '../../domain/content';

export function useSegmentPlayer(audio: AudioAsset, initialRate = 1) {
  const mediaRef = useRef<HTMLAudioElement | null>(null);
  const [selectedRate, setSelectedRate] = useState<number | null>(null);
  const rate = selectedRate ?? initialRate;
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [looping, setLooping] = useState(false);
  const setRate = useCallback((next: number) => { setSelectedRate(next); if (mediaRef.current) mediaRef.current.playbackRate = next; }, []);
  useEffect(() => { if (mediaRef.current) mediaRef.current.playbackRate = rate; }, [rate]);
  const seek = useCallback((seconds: number) => { if (mediaRef.current) mediaRef.current.currentTime = seconds; }, []);
  const selectSegment = useCallback((index: number) => { const safe = Math.max(0, Math.min(index, audio.segments.length - 1)); setSegmentIndex(safe); seek(audio.segments[safe].start); }, [audio.segments, seek]);
  const onTimeUpdate = useCallback(() => { const media = mediaRef.current; const segment = audio.segments[segmentIndex]; if (media && looping && media.currentTime >= segment.end) { media.currentTime = segment.start; void media.play(); } }, [audio.segments, looping, segmentIndex]);
  return {
    mediaRef, rate, segmentIndex, looping, onTimeUpdate,
    play: () => mediaRef.current?.play(), pause: () => mediaRef.current?.pause(), seek, setRate,
    loopSegment: () => setLooping((value) => !value),
    next: () => selectSegment(segmentIndex + 1), previous: () => selectSegment(segmentIndex - 1), selectSegment,
  };
}
