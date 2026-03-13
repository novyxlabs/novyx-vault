import { NextRequest, NextResponse } from "next/server";
import { listNotes, readNote, writeNote, createFolder, deleteNote } from "@/lib/notes";
import { getStorageContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const notePath = searchParams.get("path");

  try {
    const ctx = await getStorageContext();
    if (notePath) {
      const content = await readNote(notePath, ctx);
      return NextResponse.json({ content });
    }
    const notes = await listNotes(undefined, ctx);
    return NextResponse.json({ notes });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const { path: notePath, content, isFolder, _method } = await req.json();
    if (!notePath) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    // Support sendBeacon saves (always POST) — treat _method:"PUT" as a save
    if (_method === "PUT") {
      if (content === undefined) {
        return NextResponse.json({ error: "Content required" }, { status: 400 });
      }
      await writeNote(notePath, content, ctx);
      return NextResponse.json({ success: true });
    }

    if (isFolder) {
      await createFolder(notePath, ctx);
    } else {
      await writeNote(notePath, content ?? `# ${notePath.split("/").pop()}\n\n`, ctx);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const { path: notePath, content } = await req.json();
    if (!notePath || content === undefined) {
      return NextResponse.json({ error: "Path and content are required" }, { status: 400 });
    }

    await writeNote(notePath, content, ctx);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const { path: notePath } = await req.json();
    if (!notePath) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    await deleteNote(notePath, ctx);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
