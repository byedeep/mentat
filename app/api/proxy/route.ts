import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Proxy API scaffolded. Implementation pending." },
    { status: 501 },
  );
}
