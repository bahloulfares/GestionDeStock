import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import pdfMake from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor() {
    // Enregistrer les polices standard (built-in Helvetica) une seule fois
    pdfMake.setFonts({
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    });
  }

  async generateBuffer(docDefinition: TDocumentDefinitions): Promise<Buffer> {
    try {
      const pdfDoc = pdfMake.createPdf(docDefinition);
      return await pdfDoc.getBuffer();
    } catch (error) {
      this.logger.error(
        'Échec de la génération du PDF',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Échec de la génération du PDF.');
    }
  }
}
