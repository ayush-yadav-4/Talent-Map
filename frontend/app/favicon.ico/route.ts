import { NextResponse } from "next/server";

export function GET(request: Request) {
  const faviconUrl = new URL("/favicon.svg", request.url);
  return NextResponse.redirect(faviconUrl, { status: 307 });
}
