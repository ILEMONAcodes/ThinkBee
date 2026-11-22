import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/auth/server-client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const supabase = await getSupabaseServer();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { scanId } = await params;
    const body = await req.json();

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/api/v1/scans/${scanId}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ detail: data.detail || "Failed to get response" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Scan chat error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}