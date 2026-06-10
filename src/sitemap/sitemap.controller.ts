// src/sitemap/sitemap.controller.ts
import { Controller, Get, Header, Logger } from '@nestjs/common';
import { SitemapService } from './sitemap.service';

@Controller()
export class SitemapController {
  private readonly logger = new Logger(SitemapController.name);

  private cachedXml: string | null = null;
  private cachedAt = 0;
  private readonly CACHE_TTL_MS = 1000 * 60 * 60;

  constructor(private readonly sitemapService: SitemapService) {
    this.logger.log('SitemapController construido correctamente ✅');
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async getSitemap(): Promise<string> {
    this.logger.log('>>> Petición recibida en /sitemap.xml');
    try {
      const now = Date.now();
      if (!this.cachedXml || now - this.cachedAt > this.CACHE_TTL_MS) {
        this.logger.log('Cache vacía, generando sitemap...');
        this.cachedXml = await this.sitemapService.generate();
        this.cachedAt = now;
      }
      this.logger.log(`Sitemap devuelto (${this.cachedXml.length} chars)`);
      return this.cachedXml;
    } catch (err: any) {
      this.logger.error('💥 Error generando sitemap:', err.message);
      this.logger.error(err.stack);
      throw err;
    }
  }
}