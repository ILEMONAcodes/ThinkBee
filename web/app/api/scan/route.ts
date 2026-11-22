import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/auth/server-client";
import { z } from "zod";

const ScanRequestSchema = z.object({
  client_id: z.string().uuid(),
  farm_id: z.string().uuid().nullable().optional(),
  image_keys: z.array(z.string()).min(1),
  note: z.string().nullable().optional(),
  subject: z.enum(["hive", "crop"]),
  unit_id: z.string().uuid().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const scanReq = ScanRequestSchema.parse({
      ...body,
      client_id: crypto.randomUUID(),
    });

    // Call backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/api/v1/scans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(scanReq),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ detail: data.detail || "Failed to create scan" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Scan creation error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}