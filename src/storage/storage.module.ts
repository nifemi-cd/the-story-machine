import { Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';

/** File storage in Azure Blob Storage, for any module that imports it. */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
