import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FillBlankPreview } from "@/components/practice/fill-blank-preview";
import { Button } from "@/components/ui/button";

export default function FillBlankPreviewPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8 sm:px-10 lg:px-12">
      <div className="mb-6">
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-full border-cyan-200 bg-white/85 px-5 text-slate-700 hover:bg-cyan-50"
        >
          <Link href="/practice">
            <ArrowLeft className="size-4" />
            返回今日任务
          </Link>
        </Button>
      </div>

      <FillBlankPreview />
    </main>
  );
}
