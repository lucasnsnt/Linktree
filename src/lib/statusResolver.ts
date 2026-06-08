import { codingStatusMessages, scheduledStatusMessages } from "@/lib/statusConfig";
import { getCurrentDayPeriod } from "@/lib/time";
import type { SpotifyNowPlayingTrack } from "@/lib/spotifyTypes";

export interface DynamicStatusSeed {
  commitMessage: string;
  scheduledMessage: string;
}

export interface DynamicStatusInput {
  hasRecentCommit: boolean;
  spotifyTrack: SpotifyNowPlayingTrack | null;
}

export interface DynamicStatusOutput {
  mainMessage: string | null;
  mainMessageType: "commit" | "scheduled" | null;
  showSpotify: boolean;
}

function pickRandomMessage(messages: readonly string[]): string {
  const index = Math.floor(Math.random() * messages.length);
  return messages[index] ?? "";
}

export function createDynamicStatusSeed(): DynamicStatusSeed {
  const period = getCurrentDayPeriod();
  return {
    commitMessage: pickRandomMessage(codingStatusMessages),
    scheduledMessage: pickRandomMessage(scheduledStatusMessages[period]),
  };
}

export function resolveDynamicStatus(
  input: DynamicStatusInput,
  seed: DynamicStatusSeed,
): DynamicStatusOutput {
  if (input.hasRecentCommit) {
    return {
      mainMessage: seed.commitMessage,
      mainMessageType: "commit",
      showSpotify: Boolean(input.spotifyTrack),
    };
  }

  if (input.spotifyTrack) {
    return {
      mainMessage: null,
      mainMessageType: null,
      showSpotify: true,
    };
  }

  return {
    mainMessage: seed.scheduledMessage,
    mainMessageType: "scheduled",
    showSpotify: false,
  };
}
