import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ParsedPdr } from "@/lib/pdr/types";

interface Props {
  employeeId: string;
  onParsed: (parsed: ParsedPdr) => void;
}

const PdrUploader = ({ employeeId, onParsed }: Props) => {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast.error("Please upload a .docx file");
      return;
    }
    setBusy(true);
    try {
      setStatus("Uploading…");
      const path = `${employeeId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("pdr-documents").upload(path, file, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: userData } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("pdr_documents").insert({
        employee_id: employeeId,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: userData.user?.id ?? null,
      } as never);
      if (insErr) throw insErr;
      qc.invalidateQueries({ queryKey: ["employee", employeeId, "pdrs"] });

      setStatus("Parsing document…");
      const buf = await file.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      const { data, error } = await supabase.functions.invoke<ParsedPdr>("parse-pdr", {
        body: { file_base64: b64 },
      });
      if (error) throw error;
      if (!data) throw new Error("Empty parse response");
      onParsed(data);
      toast.success("PDR parsed — review and apply");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      setStatus("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!busy) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (busy) return;
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
      }}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragOver ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {busy ? (
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          {status || "Working…"}
        </div>
      ) : (
        <>
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Drag & drop a Year-End PDR (.docx) here, or{" "}
            <button
              type="button"
              className="text-primary font-medium underline-offset-2 hover:underline"
              onClick={() => inputRef.current?.click()}
            >
              click to browse
            </button>
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2">
            Stored securely, parsed, and shown for review before any fields are updated.
          </p>
        </>
      )}
    </div>
  );
};

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

export default PdrUploader;
