import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/auth/server-client";

export async function GET(
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

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/api/v1/scans/${scanId}`, {
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ detail: data.detail || "Scan not found" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Get scan error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}