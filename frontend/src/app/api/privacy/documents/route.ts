import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

export async function GET(): Promise<Response> {
  return forwardStaffIntake("/api/v1/privacy/documents", { method: "GET" });
}

export async function POST(request: Request): Promise<Response> {
  const action = new URL(request.url).searchParams.get("action");
  if (action === "import-docx") {
    const formData = await request.formData();
    return forwardStaffIntake("/api/v1/privacy/documents/import-docx", {
      method: "POST",
      body: formData,
    });
  }

  const body = await request.text();
  return forwardStaffIntake("/api/v1/privacy/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
