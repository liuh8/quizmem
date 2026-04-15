import { WrongBookList } from "@/components/wrong-book/wrong-book-list";

export default function WrongBookPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
      <WrongBookList />
    </main>
  );
}
