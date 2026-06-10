import { scheduledStatusMessages } from "@/lib/statusConfig";
import { getCurrentDayPeriod } from "@/lib/time";
import type { SpotifyNowPlayingTrack } from "@/lib/spotifyTypes";

export interface DynamicStatusSeed {
  scheduledMessage: string;
}

export interface DynamicStatusInput {
  spotifyTrack: SpotifyNowPlayingTrack | null;
}

export interface DynamicStatusOutput {
  statusText: string;
  showSpotifyCard: boolean;
}

function pickRandomMessage(messages: readonly string[]): string {
  const index = Math.floor(Math.random() * messages.length);
  return messages[index] ?? "";
}

export function createDynamicStatusSeed(): DynamicStatusSeed {
  const period = getCurrentDayPeriod();
  return {
    scheduledMessage: pickRandomMessage(scheduledStatusMessages[period]),
  };
}

export function resolveDynamicStatus(
  input: DynamicStatusInput,
  seed: DynamicStatusSeed,
): DynamicStatusOutput {
  if (input.spotifyTrack) {
    return {
      statusText: `ouvindo "${input.spotifyTrack.songName}" no Spotify`,
      showSpotifyCard: true,
    };
  }

  return {
    statusText: seed.scheduledMessage,
    showSpotifyCard: false,
  };
}
