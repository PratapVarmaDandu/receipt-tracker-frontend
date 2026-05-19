export type StorageType = 'LOCAL' | 'S3';

export interface StorageConfig {
  storageType: StorageType;
  localStoragePath?: string | null;
  defaultStoragePath?: string | null;
  s3BucketName?: string | null;
  s3Region?: string | null;
  s3AccessKeyId?: string | null;
  /** Write-only — send to backend when updating, never returned by GET. */
  s3SecretAccessKey?: string | null;
  /** True when a secret key is already saved in the database. */
  s3SecretKeyConfigured: boolean;
  storageConfigured: boolean;
}

export interface StorageTestResult {
  success: boolean;
  message: string;
}

export interface StorageUsage {
  totalBytes: number;
  formattedSize: string;
  filesFound: number;
  filesNotFound: number;
  storageType: string;
  location: string;
}
