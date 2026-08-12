export interface OptionDryRun {
  /**
   * If true, do not publish anything and log what's being published
   * @default false
   */
  dryRun?: boolean | undefined;
}

export interface OptionVerbose {
  /**
   * If true, output more detailed information
   * @default false
   */
  verbose?: boolean | undefined;
}

export interface OptionJSON {
  /**
   * If true, output as JSON
   * @default false
   */
  json?: boolean | undefined;
}
