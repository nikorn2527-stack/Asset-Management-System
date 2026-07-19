import { NextResponse } from 'next/server';

/**
 * PDF Generation API - simplified for local SQLite demo.
 * Uses browser-side print instead of server-side Puppeteer.
 * This route is kept for compatibility but delegates to client-side printing.
 */
export async function POST() {
  return NextResponse.json({
    message: 'PDF generation is handled client-side via browser print. Please use the print dialog.',
  });
}