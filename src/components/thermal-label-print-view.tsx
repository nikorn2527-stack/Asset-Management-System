'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Asset } from '@/types';

export type LabelSize = '70x24' | '80x36';

interface ThermalLabelPrintViewProps {
  assets: Asset[];
  labelSize: LabelSize;
  onLabelSizeChange: (size: LabelSize) => void;
  organizationName?: string;
  onClose: () => void;
  onPrint: () => void;
}

const LABEL_CONFIGS: Record<LabelSize, {
  pageW: string; pageH: string;
  qrSize: number;
  padX: string; padY: string;
  gap: string;
  fontSize: { org: string; sku: string; name: string; detail: string };
}> = {
  '70x24': {
    pageW: '70mm', pageH: '24mm',
    qrSize: 70,
    padX: '2mm', padY: '2mm',
    gap: '0.5mm',
    fontSize: { org: '5pt', sku: '9pt', name: '6.5pt', detail: '4.5pt' },
  },
  '80x36': {
    pageW: '80mm', pageH: '36mm',
    qrSize: 94,
    padX: '3mm', padY: '3mm',
    gap: '0.8mm',
    fontSize: { org: '6.5pt', sku: '12pt', name: '8.5pt', detail: '6pt' },
  },
};

function LabelContent({ asset, config }: { asset: Asset; config: typeof LABEL_CONFIGS['70x24'] }) {
  const purchaseYear = asset.purchaseDate
    ? String(new Date(asset.purchaseDate).getFullYear() + 543)
    : '';

  const details = [
    purchaseYear ? `ปี: ${purchaseYear}` : '',
    asset.location ? `แผนก: ${asset.location}` : '',
  ].filter(Boolean).join(' | ');

  return (
    <div className="thermal-label flex items-stretch" style={{
      width: config.pageW,
      height: config.pageH,
      fontFamily: "'Sarabun', sans-serif",
      boxSizing: 'border-box',
      padding: `${config.padY} ${config.padX}`,
      pageBreakAfter: 'always',
      breakAfter: 'page',
      breakInside: 'avoid',
      overflow: 'hidden',
    }}>
      {/* QR Code */}
      <div className="shrink-0 flex items-center justify-center" style={{ marginRight: '1.5mm' }}>
        <QRCodeSVG
          value={asset.sku}
          size={config.qrSize}
          level="M"
          includeMargin={false}
          bgColor="transparent"
          fgColor="#000000"
        />
      </div>

      {/* Text */}
      <div className="flex-1 flex flex-col justify-center min-w-0" style={{ gap: config.gap }}>
        <div style={{ fontSize: config.fontSize.org, color: '#555', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          หน่วยงานราชการ
        </div>
        <div style={{ fontSize: config.fontSize.sku, fontWeight: 700, lineHeight: 1.15, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {asset.sku}
        </div>
        <div style={{ fontSize: config.fontSize.name, fontWeight: 400, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {asset.name}
        </div>
        {details && (
          <div style={{ fontSize: config.fontSize.detail, color: '#777', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {details}
          </div>
        )}
      </div>
    </div>
  );
}

export function ThermalLabelPrintView({
  assets,
  labelSize,
  onLabelSizeChange,
  organizationName,
  onClose,
  onPrint,
}: ThermalLabelPrintViewProps) {
  const config = LABEL_CONFIGS[labelSize];

  // Dynamic @page injection
  useEffect(() => {
    let styleEl = document.getElementById('dynamic-print-page-style') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-print-page-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `@page { size: ${config.pageW} ${config.pageH}; margin: 0; }`;
    return () => {
      if (styleEl) styleEl.remove();
    };
  }, [config.pageW, config.pageH]);

  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Also update the @page in the print-only labels for the correct size
  const printLabelStyle = labelSize === '80x36'
    ? `width: 80mm !important; height: 36mm !important; padding: 3mm 3mm !important;`
    : `width: 70mm !important; height: 24mm !important; padding: 2mm 2.5mm !important;`;

  return (
    <div className="print-area" style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column',
    }}>
      {/* Toolbar */}
      <div className="non-printable" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0', flexShrink: 0, flexWrap: 'wrap', gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, fontFamily: "'Sarabun', sans-serif" }}>
            🖨️ พิมพ์ฉลากครุภัณฑ์
          </h2>
          <span style={{ fontSize: '13px', color: '#64748b', fontFamily: "'Sarabun', sans-serif" }}>
            {assets.length} ฉลาก
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Size Selector */}
          <div style={{ display: 'flex', borderRadius: '6px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {(['70x24', '80x36'] as LabelSize[]).map((size) => (
              <button
                key={size}
                onClick={() => onLabelSizeChange(size)}
                style={{
                  padding: '5px 14px', fontSize: '12px', border: 'none', cursor: 'pointer',
                  backgroundColor: labelSize === size ? '#059669' : 'white',
                  color: labelSize === size ? 'white' : '#374151',
                  fontWeight: labelSize === size ? 600 : 400,
                  fontFamily: "'Sarabun', sans-serif",
                  borderRight: size === '70x24' ? '1px solid #e2e8f0' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {size === '70x24' ? '70×24' : '80×36'} มม.
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '5px 14px', fontSize: '13px', border: '1px solid #e2e8f0',
              borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer',
              fontFamily: "'Sarabun', sans-serif",
            }}
          >
            ยกเลิก
          </button>
          <button
            onClick={onPrint}
            style={{
              padding: '6px 18px', fontSize: '13px', border: 'none',
              borderRadius: '6px', backgroundColor: '#059669', color: 'white',
              cursor: 'pointer', fontWeight: 600, fontFamily: "'Sarabun', sans-serif",
            }}
          >
            พิมพ์ฉลาก ({assets.length})
          </button>
        </div>
      </div>

      {/* Preview Grid */}
      <div className="non-printable" style={{
        flex: 1, overflow: 'auto', padding: '20px',
        display: 'flex', flexWrap: 'wrap', gap: '10px',
        alignContent: 'flex-start', justifyContent: 'center',
      }}>
        {assets.map((asset, idx) => (
          <div key={asset.id} style={{ position: 'relative' }}>
            <div style={{
              backgroundColor: 'white', borderRadius: '3px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}>
              <LabelContent asset={asset} config={config} />
            </div>
            <span style={{
              position: 'absolute', top: '-6px', right: '-6px',
              width: '18px', height: '18px', borderRadius: '50%',
              backgroundColor: '#d1d5db', color: '#374151', fontSize: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontFamily: 'sans-serif',
            }}>
              {idx + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Print-only: actual labels rendered for the printer */}
      <div className="print-only-labels" style={{ display: 'none' }}>
        {assets.map((asset) => (
          <div key={asset.id} className="thermal-label flex items-stretch" style={{
            width: config.pageW, height: config.pageH,
            fontFamily: "'Sarabun', sans-serif",
            boxSizing: 'border-box',
            padding: `${config.padY} ${config.padX}`,
            pageBreakAfter: 'always',
            breakAfter: 'page',
            breakInside: 'avoid',
            overflow: 'hidden',
          }}>
            <div className="shrink-0 flex items-center justify-center" style={{ marginRight: '1.5mm' }}>
              <QRCodeSVG
                value={asset.sku}
                size={config.qrSize}
                level="M"
                includeMargin={false}
                bgColor="transparent"
                fgColor="#000000"
              />
            </div>
            <div className="flex-1 flex flex-col justify-center min-w-0" style={{ gap: config.gap }}>
              <div style={{ fontSize: config.fontSize.org, color: '#555', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {organizationName || 'หน่วยงานราชการ'}
              </div>
              <div style={{ fontSize: config.fontSize.sku, fontWeight: 700, lineHeight: 1.15, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {asset.sku}
              </div>
              <div style={{ fontSize: config.fontSize.name, fontWeight: 400, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {asset.name}
              </div>
              {(() => {
                const details = [
                  asset.purchaseDate ? `ปี: ${new Date(asset.purchaseDate).getFullYear() + 543}` : '',
                  asset.location ? `แผนก: ${asset.location}` : '',
                ].filter(Boolean).join(' | ');
                return details ? (
                  <div style={{ fontSize: config.fontSize.detail, color: '#777', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {details}
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}