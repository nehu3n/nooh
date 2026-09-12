export interface NoohUnpluginOptions {
  /**
   * Nooh config path.
   *
   * @default "src/config.ts"
   */
  readonly config?: string;

  /**
   * Generated output directory.
   *
   * @default ".nooh"
   */
  readonly outputRoot?: string;
  /**
   * Project root.
   *
   * @default process.cwd()
   */
  readonly root?: string;
}
