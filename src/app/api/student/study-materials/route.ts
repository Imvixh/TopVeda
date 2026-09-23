import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { StudentStudyMaterialService } from "@/lib/services/student-study-material.service";

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "";

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to access enrolled study materials." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedBatchId = searchParams.get("batchId");
    const materialType = searchParams.get("materialType") || undefined;
    const subjectName = searchParams.get("subjectName") || undefined;
    const chapterId = searchParams.get("chapterId") || undefined;
    const search = searchParams.get("search") || undefined;

    // 1. Fetch student's enrolled batches
    const enrolledBatches = await StudentStudyMaterialService.getEnrolledBatchesForMaterials(
      supabase,
      user.id
    );

    if (enrolledBatches.length === 0) {
      return NextResponse.json({
        enrolledBatches: [],
        selectedBatchId: null,
        batchTitle: null,
        materials: [],
        authorized: true,
        message: "No active batch enrollments found for this student.",
      });
    }

    const activeBatchId = requestedBatchId || enrolledBatches[0].id;

    // 2. Fetch materials with strict server-side authorization
    const result = await StudentStudyMaterialService.getMaterialsForBatch(
      supabase,
      user.id,
      {
        batchId: activeBatchId,
        materialType,
        subjectName,
        chapterId,
        search,
      }
    );

    if (!result.authorized) {
      return NextResponse.json(
        {
          error: "Access Denied: You are not enrolled in this batch.",
          enrolledBatches,
          materials: [],
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      enrolledBatches,
      selectedBatchId: activeBatchId,
      batchTitle: result.batchTitle,
      materials: result.materials,
      authorized: true,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
