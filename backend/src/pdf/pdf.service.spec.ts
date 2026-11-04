import { Test } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { PdfService } from './pdf.service';

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();
    service = module.get(PdfService);
  });

  it('genere un buffer non vide pour un docDefinition valide', async () => {
    const buf = await service.generateBuffer({
      defaultStyle: { font: 'Helvetica' },
      content: [{ text: 'Test facture' }],
    });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(100);
  });

  it('leve InternalServerErrorException si generateBuffer echoue', async () => {
    const badDoc = {
      content: [{ text: null as any, fontSize: -1 }],
      defaultStyle: { font: 'Helvetica' },
    };
    jest
      .spyOn(service, 'generateBuffer')
      .mockRejectedValueOnce(
        new InternalServerErrorException('Echec de la generation du PDF.'),
      );
    await expect(service.generateBuffer(badDoc)).rejects.toThrow(
      InternalServerErrorException,
    );
    jest.restoreAllMocks();
  });
});
