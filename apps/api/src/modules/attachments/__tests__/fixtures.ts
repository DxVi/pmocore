/** Minimal synthetic files with the real format signatures (no real documents or photos). */
const bytes = (...values: number[]) => Buffer.from(values);

export const FIXTURES = {
  pdf: Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from('synthetic pdf body\n%%EOF')]),
  png: Buffer.concat([bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), Buffer.alloc(32, 1)]),
  jpg: Buffer.concat([bytes(0xff, 0xd8, 0xff, 0xe0), Buffer.alloc(64, 2), bytes(0xff, 0xd9)]),
  webp: Buffer.concat([
    Buffer.from('RIFF'),
    bytes(0x24, 0, 0, 0),
    Buffer.from('WEBPVP8 '),
    Buffer.alloc(24, 3),
  ]),
  docx: Buffer.concat([bytes(0x50, 0x4b, 0x03, 0x04), Buffer.from('....word/document.xml....')]),
  xlsx: Buffer.concat([bytes(0x50, 0x4b, 0x03, 0x04), Buffer.from('....xl/workbook.xml....')]),
  ole: Buffer.concat([bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1), Buffer.alloc(64, 4)]),
  heic: Buffer.concat([bytes(0, 0, 0, 0x18), Buffer.from('ftypheic'), Buffer.alloc(32, 5)]),
  zip: Buffer.concat([bytes(0x50, 0x4b, 0x03, 0x04), Buffer.from('....data.bin....')]),
};
