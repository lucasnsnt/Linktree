export interface SpotifyNowPlayingTrack {
  songName: string;
  artistNames: string;
  albumName: string;
  albumImageUrl: string | null;
  trackUrl: string | null;
  isExplicit: boolean;
}