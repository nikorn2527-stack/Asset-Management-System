'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface ThermalLabelAsset {
  sku: string;
  name: string;
  category?: { name: string } | null;
  location?: string | null;
  purchaseDate: string;
  currentValue: number;
}

interface ThermalLabelPrintViewProps {
  assets: ThermalLabelAsset[];
  onClose: () => void;
}

type LabelSize = '70x24' | '80x36';

const SIZE_CONFIG: Record<LabelSize, { w: string; h: string; qrSize: number; nameText: string; skuText: string; pageCss: string }> = {
  '70x24': {
    w: '70mm',
    h: '24mm',
    qrSize: 64,
    nameText: 'text-[7px]',
    skuText: 'text-[10px]',
    pageCss: '@page { size: 70mm 24mm; margin: 0; }',
  },
  '80x36': {
    w: '80mm',
    h: '36mm',
    qrSize: 88,
    nameText: 'text-[9px]',
    skuText: 'text-[13px]',
    pageCss: '@page { size: 80mm 36mm; margin: 0; }',
  },
};

function formatCurrency(num: number) {
  return new Intl.NumberFormat('th-TH').format(Math.round(num));
}

export function ThermalLabelPrintView({ assets, onClose }: ThermalLabelPrintViewProps) {
  const [labelSize, setLabelSize] = useState<LabelSize>('70x24');
  const config = SIZE_CONFIG[labelSize];

  const handlePrint = () => {
    // Dynamically set @page size before printing
    const existingStyle = document.getElementById('thermal-print-style');
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = 'thermal-print-style';
    style.textContent = `
      ${config.pageCss}
      @media print {
        body * { visibility: hidden !important; }
        .thermal-label-print-area, .thermal-label-print-area * { visibility: visible !important; }
        .thermal-label-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        .thermal-label-item { page-break-after: always; margin: 0 !important; padding: 2mm !important; }
        .thermal-label-item:last-child { page-break-after: auto; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);

    window.print();

    // Cleanup after print dialog closes
    setTimeout(() => {
      style.remove();
    }, 1000);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-emerald-600" />
            พิมพ์ฉลากครุภัณฑ์
          </DialogTitle>
          <DialogDescription>
            แสดงตัวอย่างฉลากสำหรับเครื่องพิมพ์ธรรมดา ({assets.length} ฉลาก)
          </DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">ขนาดฉลาก:</span>
            <ToggleGroup
              type="single"
              value={labelSize}
              onValueChange={(v) => { if (v) setLabelSize(v as LabelSize); }}
            >
              <ToggleGroupItem value="70x24" className="text-xs px-3">
                70 × 24 มม.
              </ToggleGroupItem>
              <ToggleGroupItem value="80x36" className="text-xs px-3">
                80 × 36 มม.
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Printer className="h-4 w-4 mr-2" />
            พิมพ์
          </Button>
        </div>

        {/* Print Preview */}
        <ScrollArea className="max-h-[55vh] no-print">
          <div className="space-y-3 p-2">
            {assets.map((asset) => (
              <div
                key={asset.sku}
                className="flex items-center border rounded-lg overflow-hidden bg-white"
                style={{ width: config.w, minHeight: config.h }}
              >
                {/* QR Code */}
                <div className="shrink-0 flex items-center justify-center p-1.5">
                  <QRCodeSVG
                    value={asset.sku}
                    size={config.qrSize}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 py-1.5 pr-2 pl-1">
                  <p className={`font-semibold text-muted-foreground ${config.nameText} leading-tight`}>
                    หน่วยงานต้นสังกัด
                  </p>
                  <p className={`font-bold font-mono text-foreground ${config.skuText} leading-tight mt-0.5`}>
                    {asset.sku}
                  </p>
                  <p className={`${config.nameText} text-foreground leading-tight mt-0.5 truncate`} title={asset.name}>
                    {asset.name}
                  </p>
                  {labelSize === '80x36' && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`${config.nameText} text-muted-foreground`}>
                        {asset.purchaseDate ? format(new Date(asset.purchaseDate), 'yyyy') : '-'}
                      </span>
                      {asset.location && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className={`${config.nameText} text-muted-foreground truncate`}>
                            {asset.location}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Hidden print area - only visible when printing */}
        <div className="thermal-label-print-area" style={{ display: 'none' }}>
          {assets.map((asset) => (
            <div
              key={asset.sku}
              className="thermal-label-item flex items-center"
              style={{ width: config.w, height: config.h, fontFamily: 'Sarabun, sans-serif' }}
            >
              <div className="shrink-0 flex items-center justify-center p-1.5">
                <QRCodeSVG
                  value={asset.sku}
                  size={config.qrSize}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="flex-1 min-w-0 py-1.5 pr-2 pl-1">
                <p className={`${config.nameText} text-gray-500 leading-tight`}>
                  หน่วยงานต้นสังกัด
                </p>
                <p className={`font-bold font-mono ${config.skuText} leading-tight mt-0.5`}>
                  {asset.sku}
                </p>
                <p className={`${config.nameText} leading-tight mt-0.5 truncate`} title={asset.name}>
                  {asset.name}
                </p>
                {labelSize === '80x36' && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`${config.nameText} text-gray-500`}>
                      {asset.purchaseDate ? format(new Date(asset.purchaseDate), 'yyyy') : '-'}
                    </span>
                    {asset.location && (
                      <>
                        <span className="text-gray-400">·</span>
                        <span className={`${config.nameText} text-gray-500 truncate`}>
                          {asset.location}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}