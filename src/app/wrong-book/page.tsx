import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WrongBookList } from "@/components/wrong-book/wrong-book-list";

export default function WrongBookPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
      <div className="mb-6">
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-full border-cyan-200 bg-white/85 px-5 text-slate-700 hover:bg-cyan-50"
        >
          <Link href="/">
            <ArrowLeft className="size-4" />
            返回首页
          </Link>
        </Button>
      </div>

      <WrongBookList />
    </main>
  );
}
