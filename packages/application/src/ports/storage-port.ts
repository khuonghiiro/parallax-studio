import type { Manifest, EntityId } from '@parallax/contracts';

/**
 * Port interface for project file persistence.
 * Implemented by adapters for filesystem, database, etc.
 *
 * The application layer uses this interface — it never imports
 * Node.js fs, Tauri fs, or any concrete I/O directly.
 */
export interface StoragePort {
  /**
   * Read the project manifest from disk.
   * @param projectPath Absolute path to the project directory.
   */
  readManifest(projectPath: string): Promise<Manifest>;

  /**
   * Write the project manifest to disk atomically.
   * @param projectPath Absolute path to the project directory.
   * @param manifest The manifest to write.
   */
  writeManifest(projectPath: string, manifest: Manifest): Promise<void>;

  /**
   * Read a JSON file from an asset or scene directory.
   * @param projectPath Absolute path to the project directory.
   * @param relativePath Path relative to the project root.
   */
  readJson<T>(projectPath: string, relativePath: string): Promise<T>;

  /**
   * Write a JSON file to an asset or scene directory atomically.
   * @param projectPath Absolute path to the project directory.
   * @param relativePath Path relative to the project root.
   * @param data The data to serialize.
   */
  writeJson(
    projectPath: string,
    relativePath: string,
    data: unknown,
  ): Promise<void>;

  /**
   * Copy a source image into the asset's source directory.
   * @param projectPath Absolute path to the project directory.
   * @param sourcePath Absolute path to the source file.
   * @param destRelativePath Destination relative to project root.
   */
  importFile(
    projectPath: string,
    sourcePath: string,
    destRelativePath: string,
  ): Promise<void>;

  /**
   * Create the directory structure for a new asset.
   */
  createAssetDirectories(
    projectPath: string,
    assetId: EntityId,
  ): Promise<void>;

  /**
   * Check if a file exists.
   */
  exists(projectPath: string, relativePath: string): Promise<boolean>;

  /**
   * Delete a file or directory.
   */
  remove(projectPath: string, relativePath: string): Promise<void>;
}
