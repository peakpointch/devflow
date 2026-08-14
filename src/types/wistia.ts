export interface WistiaMediaResponse {
  media: Media;
  options: Record<string, unknown>;
  error?: true;
}

export interface Media {
  accountId: number;
  accountKey: string;
  analyticsHost: string;
  formsHost: string;
  formEventsApi: string;
  aspectRatio: number;
  assets: Asset[];
  branding: boolean;
  createdAt: number;
  distilleryUrl: string;
  duration: number;
  enableCustomerLogo: boolean;
  firstEmbedForAccount: boolean;
  firstShareForAccount: boolean;
  availableTranscripts: any[];
  hashedId: string;
  mediaId: number;
  mediaKey: string;
  mediaType: "Video" | string;
  name: string;
  preloadPreference: string | null;
  progress: number;
  protected: boolean;
  projectId: number;
  seoDescription: string;
  showAbout: boolean;
  status: number;
  type: string;
  playableWithoutInstantHls: boolean;
  stats: MediaStats;
  trackingTransmitInterval: number;
  liveStreamEventDetails: null | any;
  integrations: Record<string, unknown>;
  hls_enabled: boolean;
  embed_options: EmbedOptions;
  embedOptions: EmbedOptions; // API returns both camelCase and snake_case
}

export interface Asset {
  is_enhanced: boolean;
  type:
    | "original"
    | "iphone_video"
    | "mp4_video"
    | "md_mp4_video"
    | "hd_mp4_video"
    | "still_image"
    | "storyboard";
  slug: string;
  display_name: string;
  details: Record<string, unknown>;
  width: number;
  height: number;
  size: number;
  bitrate: number;
  public: boolean;
  status: number;
  progress: number;
  metadata: AssetMetadata;
  url: string;
  created_at: number;
  container?: string;
  codec?: string;
  ext?: string;
  segment_duration?: number;
  opt_vbitrate?: number;
}

export interface AssetMetadata {
  av_stream_metadata?: string; // This is a JSON string in your payload
  max_bitrate?: number;
  average_bitrate?: number;
  early_max_bitrate?: number;
  time_to_ready?: number;
  frame_count?: number;
  aspect_ratio?: number;
  frame_height?: number;
  frame_width?: number;
}

// Parsed version of the av_stream_metadata string
export interface AvStreamMetadata {
  FastStart?: boolean;
  Audio: {
    bitRate: number;
    channels: number;
    channelLayout: string;
    codec: string;
    duration: number;
    sampleRate: number;
  };
  Video: {
    bitRate: string | number;
    codec: string;
    duration: number;
    height: number;
    width: number;
    rFrameRate: string;
  };
}

export interface MediaStats {
  loadCount: number;
  playCount: number;
  uniqueLoadCount: number;
  uniquePlayCount: number;
  averageEngagement: number;
}

export interface EmbedOptions {
  opaqueControls: boolean;
  playerColor: string;
  playerColorGradient: {
    on: boolean;
    colors: [string, number][];
  };
  plugin: Record<string, unknown>;
  volumeControl: string;
  fullscreenButton: string;
  controlsVisibleOnLoad: string;
  bpbTime: string;
  roundedPlayer: number;
  vulcan: boolean;
  newRoundedIcons: boolean;
  shouldShowCaptionsSettings: boolean;
}
