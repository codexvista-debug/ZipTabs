declare module "mammoth" {
  export interface ConversionResult {
    value: string;
    messages: any[];
  }
  export function convertToHtml(input: { arrayBuffer?: ArrayBuffer; buffer?: Buffer }): Promise<ConversionResult>;
  export function extractRawText(input: { arrayBuffer?: ArrayBuffer; buffer?: Buffer }): Promise<ConversionResult>;
}
