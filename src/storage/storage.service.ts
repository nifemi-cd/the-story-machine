import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob';

/**
 * Saves, reads and deletes files in Azure Blob Storage. The rest of the app
 * goes through this service rather than using the Azure SDK directly.
 *
 * Uses the container named by AZURE_STORAGE_CONTAINER ("stories" by default),
 * so tests can point at a separate container.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly container: ContainerClient;

  constructor(configService: ConfigService) {
    const client = BlobServiceClient.fromConnectionString(
      configService.getOrThrow<string>('AZURE_STORAGE_CONNECTION_STRING'),
    );
    this.container = client.getContainerClient(
      configService.get<string>('AZURE_STORAGE_CONTAINER') ?? 'stories',
    );
  }

  /** Called by Nest on startup; creates the container if it's missing. */
  async onModuleInit() {
    await this.container.createIfNotExists();
  }

  /**
   * Uploads a file, replacing any file already stored under that name.
   *
   * @param name path inside the container, e.g. "drafts/<storyId>.txt"
   * @returns the file's URL
   */
  async upload(
    name: string,
    content: Buffer,
    contentType: string,
  ): Promise<string> {
    const blob = this.container.getBlockBlobClient(name);
    await blob.uploadData(content, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    return blob.url;
  }

  /**
   * Returns a file's contents. Loads the whole file into memory, which is
   * fine for small text files.
   *
   * @throws RestError 404 if no file has this name
   */
  async download(name: string): Promise<Buffer> {
    return await this.container.getBlockBlobClient(name).downloadToBuffer();
  }

  /** Deletes a file; does nothing if it's already gone. */
  async delete(name: string): Promise<void> {
    await this.container.deleteBlob(name).catch(() => undefined);
  }
}
