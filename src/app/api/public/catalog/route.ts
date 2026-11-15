import { NextResponse } from "next/server";
import { initializeAdmin } from "@/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = initializeAdmin();
    const [limitsSnap, marketplaceSnap] = await Promise.all([
      db.doc("system/config/limits/default").get(),
      db.collection("system/config/marketplace").get(),
    ]);

    const limitsDoc = limitsSnap.exists ? { id: limitsSnap.id, ...limitsSnap.data() } : null;
    const marketplaceDocs = marketplaceSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({
      ok: true,
      limitsDoc,
      marketplaceDocs,
    });
  } catch {
    // Graceful fallback in preview environments without server-side ADC credentials
    return NextResponse.json({
      ok: false,
      limitsDoc: null,
      marketplaceDocs: [],
    });
  }
}
