import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/auth/server-client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.S3_BUCKET || "thinkbee";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { contentType } = await req.json();
    if (!contentType || !contentType.startsWith("image/")) {
      return NextResponse.json({ detail: "Invalid content type" }, { status: 400 });
    }

    const ext = contentType === "image/jpeg" ? ".jpg" : contentType === "image/png" ? ".png" : ".webp";
    const key = `scans/${session.user.id}/${crypto.randomUUID()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ uploadUrl, key });
  } catch (err) {
    console.error("Upload URL error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}